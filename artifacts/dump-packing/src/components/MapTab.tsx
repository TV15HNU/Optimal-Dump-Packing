import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGeneratePackGps } from "@workspace/api-client-react";
import { runAtAngle, DEFAULT_TRUCKS, type TruckConfig, type RotScore, type LocalPackResult } from "@/engine/localEngine";

interface GpsPt { lat: number; lng: number; }

// India center
const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const INDIA_ZOOM = 5;

const SWEEP_MS = 200;

// ── Vanilla Leaflet map (no react-leaflet dependency issues) ──────────────────
function LeafletMap({
  points,
  onAddPoint,
  layer,
}: {
  points: GpsPt[];
  onAddPoint: (lat: number, lng: number) => void;
  layer: "satellite" | "osm";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<any>(null);
  const markersRef    = useRef<any[]>([]);
  const polyRef       = useRef<any>(null);
  const layerRef      = useRef<any>({ sat: null, osm: null });
  const addPointRef   = useRef(onAddPoint);
  addPointRef.current = onAddPoint;

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    import("leaflet").then((L) => {
      const Ldef = L.default;
      delete (Ldef.Icon.Default.prototype as any)._getIconUrl;
      Ldef.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = Ldef.map(containerRef.current!, {
        center: INDIA_CENTER,
        zoom:   INDIA_ZOOM,
        zoomControl: true,
      });
      mapRef.current = map;

      const sat = Ldef.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Esri World Imagery", maxZoom: 19 }
      );
      const osm = Ldef.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { attribution: "&copy; OpenStreetMap", maxZoom: 19 }
      );

      layerRef.current = { sat, osm };
      sat.addTo(map);

      map.on("click", (e: any) => {
        addPointRef.current(e.latlng.lat, e.latlng.lng);
      });
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Switch base layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const { sat, osm } = layerRef.current;
    if (layer === "satellite") { map.removeLayer(osm); sat.addTo(map); }
    else                       { map.removeLayer(sat); osm.addTo(map); }
  }, [layer]);

  // Update markers + polygon
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then((L) => {
      const Ldef = L.default;
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = points.map((p) =>
        Ldef.circleMarker([p.lat, p.lng], { radius: 6, color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 1 }).addTo(map)
      );
      if (polyRef.current) map.removeLayer(polyRef.current);
      if (points.length >= 3) {
        polyRef.current = Ldef.polygon(
          points.map((p) => [p.lat, p.lng] as [number, number]),
          { color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.12, weight: 2.5, dashArray: "6 4" }
        ).addTo(map);
      }
    });
  }, [points]);

  return <div ref={containerRef} className="h-full w-full" />;
}

// ── GPS → local metric projection ────────────────────────────────────────────
function gpsToLocal(pts: GpsPt[]): { x: number; y: number }[] {
  if (pts.length === 0) return [];
  const R = 6371000;
  const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length * Math.PI / 180;
  const lng0 = pts.reduce((s, p) => s + p.lng, 0) / pts.length * Math.PI / 180;
  return pts.map((p) => ({
    x: (p.lng * Math.PI / 180 - lng0) * R * Math.cos(lat0),
    y: (p.lat * Math.PI / 180 - lat0) * R,
  }));
}

// ── Small canvas for iteration preview ────────────────────────────────────────
function IterationCanvas({ result }: { result: LocalPackResult | null }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current; if (!c || !result) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);

    const poly = result.polygon;
    if (poly.length < 2) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const all = [...poly, ...result.spots.map((s) => ({ x: s.x, y: s.y }))];
    for (const p of all) { if (p.x<minX) minX=p.x; if (p.y<minY) minY=p.y; if (p.x>maxX) maxX=p.x; if (p.y>maxY) maxY=p.y; }
    const scale = Math.min((W-20)/(maxX-minX||1), (H-20)/(maxY-minY||1));
    const ox = W/2 - ((minX+maxX)/2)*scale, oy = H/2 - ((minY+maxY)/2)*scale;
    const tx = (p: {x:number;y:number}) => ({ x: p.x*scale+ox, y: p.y*scale+oy });

    // polygon
    const tp = poly.map(tx);
    ctx.beginPath(); ctx.moveTo(tp[0].x, tp[0].y);
    for (let i=1;i<tp.length;i++) ctx.lineTo(tp[i].x,tp[i].y);
    ctx.closePath(); ctx.fillStyle="rgba(99,108,130,0.15)"; ctx.fill();
    ctx.strokeStyle="rgba(148,163,184,0.7)"; ctx.lineWidth=1.5; ctx.stroke();

    // spots
    for (const s of result.spots) {
      const tp2 = tx(s);
      ctx.beginPath(); ctx.arc(tp2.x, tp2.y, Math.max(2, scale*3.5), 0, Math.PI*2);
      ctx.fillStyle="rgba(245,158,11,0.7)"; ctx.fill();
    }
  }, [result]);

  return <canvas ref={ref} width={160} height={120} className="w-full h-full" />;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MapTab() {
  const [gpsPts, setGpsPts]         = useState<GpsPt[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [truckId, setTruckId]         = useState("cat-793");
  const [layer, setLayer]             = useState<"satellite" | "osm">("satellite");
  const [leafletReady, setLeafletReady] = useState(false);

  // Rotation sweep
  const [sweeping, setSweeping]       = useState(false);
  const [sweepAngle, setSweepAngle]   = useState<number | null>(null);
  const [sweepScores, setSweepScores] = useState<RotScore[]>([]);
  const [sweepResults, setSweepResults] = useState<LocalPackResult[]>([]);
  const [bestSoFar, setBestSoFar]     = useState<number | null>(null);
  const [finalResult, setFinalResult] = useState<LocalPackResult | null>(null);
  const sweepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateMutation = useGeneratePackGps();

  useEffect(() => {
    import("leaflet/dist/leaflet.css" as string).catch(() => {});
    import("leaflet").then(() => setLeafletReady(true)).catch(() => {});
  }, []);

  const addPoint  = useCallback((lat: number, lng: number) => setGpsPts((p) => [...p, { lat, lng }]), []);
  const clearAll  = useCallback(() => {
    setGpsPts([]); setFinalResult(null); setSweepScores([]); setSweepResults([]);
    setSweeping(false); setSweepAngle(null); setBestSoFar(null);
    if (sweepRef.current) { clearInterval(sweepRef.current); sweepRef.current = null; }
  }, []);

  function parseManual(text: string): GpsPt[] {
    return text.trim().split("\n")
      .map((line) => { const [lat, lng] = line.split(",").map(Number); return { lat, lng }; })
      .filter((p) => !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0);
  }

  const truck = DEFAULT_TRUCKS.find((t) => t.id === truckId) ?? DEFAULT_TRUCKS[0];

  const runSweep = useCallback((pts: GpsPt[], t: TruckConfig) => {
    const localPts = gpsToLocal(pts);
    if (localPts.length < 3) return;

    if (sweepRef.current) { clearInterval(sweepRef.current); sweepRef.current = null; }
    setSweeping(true); setSweepScores([]); setSweepResults([]);
    setBestSoFar(null); setFinalResult(null);

    const rotStep = 5;
    const angles: number[] = [];
    for (let a = 0; a < 60; a += rotStep) angles.push(a);

    let idx = 0;
    let localScores: RotScore[] = [];
    let localResults: LocalPackResult[] = [];
    let localBestCount = 0;
    let localBestAngle = 0;

    sweepRef.current = setInterval(() => {
      if (idx >= angles.length) {
        clearInterval(sweepRef.current!); sweepRef.current = null;
        setSweeping(false); setSweepAngle(null);
        // pick best
        const best = localResults.reduce((a, b) => a.metrics.spotCount >= b.metrics.spotCount ? a : b, localResults[0]);
        setFinalResult(best);
        return;
      }

      const a = angles[idx];
      const r = runAtAngle(localPts, t, a);
      localScores = [...localScores, { angle: a, spotCount: r.metrics.spotCount }];
      localResults = [...localResults, r];
      setSweepScores([...localScores]);
      setSweepResults([...localResults]);
      setSweepAngle(a);

      if (r.metrics.spotCount > localBestCount) {
        localBestCount = r.metrics.spotCount;
        localBestAngle = a;
        setBestSoFar(localBestAngle);
      }
      idx++;
    }, SWEEP_MS);
  }, []);

  useEffect(() => () => { if (sweepRef.current) clearInterval(sweepRef.current); }, []);

  const handleGenerate = useCallback(() => {
    const pts = gpsPts.length >= 3 ? gpsPts : parseManual(manualInput);
    if (pts.length < 3) return;
    runSweep(pts, truck);
  }, [gpsPts, manualInput, truck, runSweep]);

  const handleExport = useCallback(() => {
    const plan = finalResult;
    if (!plan) return;
    const blob = new Blob([JSON.stringify({ plan, truckId, gpsPolygon: gpsPts.length ? gpsPts : parseManual(manualInput), generatedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `gps-dump-plan-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [finalResult, truckId, gpsPts, manualInput]);

  const maxScore = Math.max(...sweepScores.map((s) => s.spotCount), 1);
  const trucks = DEFAULT_TRUCKS;

  return (
    <div className="flex h-full gap-4 p-4 overflow-hidden">

      {/* ── Left controls ── */}
      <div className="flex flex-col gap-3 w-72 shrink-0 overflow-y-auto">

        {/* Map controls */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Map Layer</div>
          <div className="flex gap-2">
            {(["satellite", "osm"] as const).map((l) => (
              <button key={l} onClick={() => setLayer(l)}
                className={`flex-1 py-1.5 text-xs rounded border ${layer === l ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}>
                {l === "satellite" ? "Satellite" : "Street"}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Centered on India. Pan / zoom freely.</div>
        </div>

        {/* GPS input */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">GPS Polygon</div>
          <div className="text-xs text-muted-foreground mb-1">Click map to add vertices, or paste lat,lng below:</div>
          <textarea value={manualInput} onChange={(e) => setManualInput(e.target.value)}
            placeholder={"20.5937, 78.9629\n20.5950, 78.9680\n20.5920, 78.9700"}
            className="w-full h-20 bg-secondary border border-border rounded text-xs font-mono p-2 text-foreground placeholder:text-muted-foreground resize-none"
            data-testid="gps-manual-input" />
          <div className="mt-1 text-xs text-muted-foreground font-mono">{gpsPts.length} map points</div>
        </div>

        {/* Truck */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Truck</div>
          {trucks.map((t) => (
            <button key={t.id} onClick={() => setTruckId(t.id)}
              className={`block w-full text-left text-xs px-2 py-1.5 rounded border mb-1 ${truckId === t.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:bg-muted"}`}
              data-testid={`gps-truck-${t.id}`}>{t.name}</button>
          ))}
        </div>

        {/* Actions */}
        <div className="bg-card border border-border rounded p-3 flex flex-col gap-2">
          <button onClick={handleGenerate}
            disabled={sweeping || (gpsPts.length < 3 && parseManual(manualInput).length < 3)}
            className="w-full py-2 text-sm bg-primary text-primary-foreground rounded font-semibold disabled:opacity-40 hover:opacity-90"
            data-testid="button-gps-generate">
            {sweeping ? `Scanning ${sweepAngle}°…` : "Generate Plan"}
          </button>
          {finalResult && (
            <button onClick={handleExport}
              className="w-full py-1.5 text-xs bg-secondary border border-border rounded hover:bg-muted font-semibold"
              data-testid="button-gps-export">
              Export JSON
            </button>
          )}
          <button onClick={clearAll}
            className="w-full py-1.5 text-xs bg-secondary border border-border rounded hover:bg-muted"
            data-testid="button-gps-clear">
            Clear All
          </button>
        </div>

        {/* Final result metrics */}
        <AnimatePresence>
          {finalResult && !sweeping && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-card border border-primary/30 rounded p-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">★ Optimal Result</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                <span className="text-muted-foreground">Spots</span>
                <span className="font-mono text-primary font-bold">{finalResult.metrics.spotCount}</span>
                <span className="text-muted-foreground">vs Grid</span>
                <span className="font-mono">{finalResult.metrics.squareGridCount}</span>
                <span className="text-muted-foreground">Improvement</span>
                <span className="font-mono text-green-400">+{finalResult.metrics.improvementPercent.toFixed(1)}%</span>
                <span className="text-muted-foreground">Best Angle</span>
                <span className="font-mono text-amber-400">{finalResult.bestRotation}°</span>
                <span className="text-muted-foreground">Inset Area</span>
                <span className="font-mono">{finalResult.metrics.insetArea.toFixed(0)} m²</span>
                <span className="text-muted-foreground">Lanes</span>
                <span className="font-mono">{finalResult.lanes.length}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Right area: map + sweep panels ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">

        {/* Map */}
        <div className="flex gap-2 shrink-0 text-xs">
          <span className="text-muted-foreground self-center">
            {sweeping ? <span className="text-amber-400 font-mono">Scanning rotations… {sweepAngle}° (best: {bestSoFar !== null ? `${bestSoFar}°` : "—"})</span>
              : finalResult ? <span className="text-green-400">Plan ready — {finalResult.metrics.spotCount} spots at {finalResult.bestRotation}°</span>
              : "Click on map to draw polygon vertices"}
          </span>
        </div>

        <div className="flex-1 rounded overflow-hidden border border-border" style={{ minHeight: 0 }}>
          {leafletReady
            ? <LeafletMap points={gpsPts} onAddPoint={addPoint} layer={layer} />
            : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading map…</div>
          }
        </div>

        {/* Rotation sweep bar chart */}
        {sweepScores.length > 0 && (
          <div className="bg-card border border-border rounded px-3 pt-2 pb-1 shrink-0">
            <div className="text-[10px] text-muted-foreground font-mono mb-1 uppercase tracking-wider">Rotation Sweep — Each Bar = One Angle</div>
            <div className="flex items-end gap-0.5 h-16">
              {sweepScores.map((s) => {
                const h = Math.max(4, Math.round((s.spotCount / maxScore) * 44));
                const isBest = !sweeping && s.angle === finalResult?.bestRotation;
                const isCurrent = sweeping && s.angle === sweepAngle;
                const isBestSoFar = sweeping && s.angle === bestSoFar;
                return (
                  <div key={s.angle} className="flex flex-col items-center gap-0.5 flex-1 min-w-0" title={`${s.angle}°: ${s.spotCount} spots`}>
                    <motion.div initial={{ height: 0 }} animate={{ height: h }}
                      className={`w-full rounded-t ${isBest ? "bg-primary" : isCurrent ? "bg-white" : isBestSoFar ? "bg-amber-400" : "bg-secondary"}`} />
                    <span className="text-[7px] text-muted-foreground font-mono">{s.angle}°</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Iteration thumbnails */}
        {sweepResults.length > 0 && (
          <div className="bg-card border border-border rounded p-2 shrink-0">
            <div className="text-[10px] text-muted-foreground font-mono mb-2 uppercase tracking-wider">
              Iteration Snapshots — winner highlighted
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sweepResults.map((r, i) => {
                const score = sweepScores[i];
                const isBest = !sweeping && r.bestRotation === finalResult?.bestRotation;
                const isBestSoFar = sweeping && r.bestRotation === bestSoFar;
                return (
                  <div key={i}
                    className={`shrink-0 rounded border overflow-hidden ${
                      isBest ? "border-primary ring-1 ring-primary" :
                      isBestSoFar ? "border-amber-500" : "border-border"
                    }`}
                    style={{ width: 90, height: 70 }}
                    title={`${r.bestRotation}°: ${r.metrics.spotCount} spots`}
                  >
                    <div className="relative w-full h-full bg-[#0b0e15]">
                      <IterationCanvas result={r} />
                      <div className={`absolute bottom-0 inset-x-0 text-[9px] font-mono text-center py-0.5 ${isBest ? "bg-primary text-primary-foreground" : isBestSoFar ? "bg-amber-500 text-black" : "bg-black/60 text-muted-foreground"}`}>
                        {r.bestRotation}° · {r.metrics.spotCount}sp
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
