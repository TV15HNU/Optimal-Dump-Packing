import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  runAtAngle, DEFAULT_TRUCKS,
  type TruckConfig, type RotScore, type LocalPackResult, type Pt,
} from "@/engine/localEngine";
import { usePlanContext } from "@/lib/planContext";
import PackingCanvas from "./PackingCanvas";

interface GpsPt { lat: number; lng: number; }

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const INDIA_ZOOM = 5;
const SWEEP_MS = 200;

// ── Vanilla Leaflet map ──────────────────────────────────────────────────────
function LeafletMap({
  points, onAddPoint, layer, fitTo,
}: {
  points: GpsPt[];
  onAddPoint: (lat: number, lng: number) => void;
  layer: "satellite" | "osm";
  fitTo: GpsPt[] | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<any>(null);
  const markersRef    = useRef<any[]>([]);
  const polyRef       = useRef<any>(null);
  const layerRef      = useRef<any>({ sat: null, osm: null });
  const addPointRef   = useRef(onAddPoint);
  addPointRef.current = onAddPoint;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    import("leaflet").then((L) => {
      const Ldef = L.default;
      delete (Ldef.Icon.Default.prototype as any)._getIconUrl;
      const map = Ldef.map(containerRef.current!, { center: INDIA_CENTER, zoom: INDIA_ZOOM });
      mapRef.current = map;
      const sat = Ldef.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "Esri", maxZoom: 19 });
      const osm = Ldef.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "OSM", maxZoom: 19 });
      layerRef.current = { sat, osm };
      sat.addTo(map);
      map.on("click", (e: any) => addPointRef.current(e.latlng.lat, e.latlng.lng));
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const { sat, osm } = layerRef.current;
    if (layer === "satellite") { try { map.removeLayer(osm); } catch {} sat.addTo(map); }
    else { try { map.removeLayer(sat); } catch {} osm.addTo(map); }
  }, [layer]);

  // Update markers + polygon
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    import("leaflet").then((L) => {
      const Ldef = L.default;
      markersRef.current.forEach((m) => { try { map.removeLayer(m); } catch {} });
      markersRef.current = points.map((p) =>
        Ldef.circleMarker([p.lat, p.lng], { radius: 8, color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.9, weight: 2 }).addTo(map)
      );
      if (polyRef.current) { try { map.removeLayer(polyRef.current); } catch {} }
      if (points.length >= 3) {
        polyRef.current = Ldef.polygon(
          points.map((p) => [p.lat, p.lng] as [number, number]),
          { color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.12, weight: 2.5, dashArray: "6 4" }
        ).addTo(map);
      }
    });
  }, [points]);

  // Fly to bounds when coordinates change
  useEffect(() => {
    const map = mapRef.current; if (!map || !fitTo || fitTo.length < 2) return;
    import("leaflet").then((L) => {
      const bounds = L.default.latLngBounds(fitTo.map((p) => [p.lat, p.lng] as [number, number]));
      map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 16, duration: 1 });
    });
  }, [fitTo]);

  return <div ref={containerRef} className="h-full w-full" />;
}

// ── GPS → local metric projection ──
function gpsToLocal(pts: GpsPt[]): Pt[] {
  if (pts.length === 0) return [];
  const R = 6371000;
  const lat0 = (pts.reduce((s, p) => s + p.lat, 0) / pts.length) * Math.PI / 180;
  const lng0 = (pts.reduce((s, p) => s + p.lng, 0) / pts.length) * Math.PI / 180;
  return pts.map((p) => ({
    x: (p.lng * Math.PI / 180 - lng0) * R * Math.cos(lat0),
    y: (p.lat * Math.PI / 180 - lat0) * R,
  }));
}

export default function MapTab() {
  const { customTrucks, addCustomTruck, removeCustomTruck } = usePlanContext();

  const [gpsPts, setGpsPts]             = useState<GpsPt[]>([]);
  const [manualInput, setManualInput]   = useState("");
  const [parsedManual, setParsedManual] = useState<GpsPt[]>([]);
  const [truckId, setTruckId]           = useState("cat-793");
  const [layer, setLayer]               = useState<"satellite" | "osm">("satellite");
  const [leafletReady, setLeafletReady] = useState(false);
  const [fitTo, setFitTo]               = useState<GpsPt[] | null>(null);

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm]         = useState<Omit<TruckConfig, "id">>({
    name: "", width: 9, length: 14, turningRadius: 12, spacingX: 13.5, spacingY: 13.5, payloadTonnes: 200,
  });
  const [customError, setCustomError] = useState("");

  // Sweep state
  const [sweeping, setSweeping]           = useState(false);
  const [sweepAngle, setSweepAngle]       = useState<number | null>(null);
  const [sweepScores, setSweepScores]     = useState<RotScore[]>([]);
  const [sweepResults, setSweepResults]   = useState<LocalPackResult[]>([]);
  const [bestSoFar, setBestSoFar]         = useState<number | null>(null);
  const [finalResult, setFinalResult]     = useState<LocalPackResult | null>(null);
  // Live display result (for sweep canvas)
  const [liveResult, setLiveResult]       = useState<LocalPackResult | null>(null);
  const sweepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allTrucks: TruckConfig[] = [...DEFAULT_TRUCKS, ...customTrucks];
  const truck = allTrucks.find((t) => t.id === truckId) ?? DEFAULT_TRUCKS[0];

  useEffect(() => {
    import("leaflet/dist/leaflet.css" as string).catch(() => {});
    import("leaflet").then(() => setLeafletReady(true)).catch(() => {});
  }, []);

  const addPoint = useCallback((lat: number, lng: number) => setGpsPts((p) => [...p, { lat, lng }]), []);

  const handleManualChange = useCallback((text: string) => {
    setManualInput(text);
    const parsed = text.trim().split("\n")
      .map((line) => {
        const parts = line.split(",");
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        return { lat, lng };
      })
      .filter((p) => !isNaN(p.lat) && !isNaN(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180);
    setParsedManual(parsed);
    if (parsed.length >= 2) setFitTo(parsed);
  }, []);

  const clearAll = useCallback(() => {
    setGpsPts([]); setParsedManual([]); setManualInput("");
    setFinalResult(null); setLiveResult(null);
    setSweepScores([]); setSweepResults([]);
    setSweeping(false); setSweepAngle(null); setBestSoFar(null);
    if (sweepRef.current) { clearInterval(sweepRef.current); sweepRef.current = null; }
    setFitTo(null);
  }, []);

  // All points to show on map: clicked + pasted (if no clicks yet)
  const mapDisplayPts: GpsPt[] = gpsPts.length > 0 ? gpsPts : parsedManual;
  // Active polygon for packing
  const activePts: GpsPt[] = gpsPts.length >= 3 ? gpsPts : parsedManual;
  const hasPts = activePts.length >= 3;

  const runSweep = useCallback((pts: GpsPt[], t: TruckConfig) => {
    const localPts = gpsToLocal(pts);
    if (localPts.length < 3) return;
    if (sweepRef.current) { clearInterval(sweepRef.current); sweepRef.current = null; }
    setSweeping(true); setSweepScores([]); setSweepResults([]);
    setBestSoFar(null); setFinalResult(null); setLiveResult(null);

    const angles: number[] = [];
    for (let a = 0; a < 60; a += 5) angles.push(a);

    let idx = 0;
    let localScores: RotScore[] = [], localResults: LocalPackResult[] = [];
    let localBestCount = 0, localBestAngle = 0;

    sweepRef.current = setInterval(() => {
      if (idx >= angles.length) {
        clearInterval(sweepRef.current!); sweepRef.current = null;
        setSweeping(false); setSweepAngle(null);
        const best = localResults.reduce((a, b) => a.metrics.spotCount >= b.metrics.spotCount ? a : b, localResults[0]);
        setFinalResult(best); setLiveResult(best);
        return;
      }
      const a = angles[idx];
      const r = runAtAngle(localPts, t, a);
      localScores  = [...localScores, { angle: a, spotCount: r.metrics.spotCount }];
      localResults = [...localResults, r];
      setSweepScores([...localScores]);
      setSweepResults([...localResults]);
      setSweepAngle(a);
      setLiveResult(r);  // show live on canvas
      if (r.metrics.spotCount > localBestCount) {
        localBestCount = r.metrics.spotCount; localBestAngle = a; setBestSoFar(localBestAngle);
      }
      idx++;
    }, SWEEP_MS);
  }, []);

  useEffect(() => () => { if (sweepRef.current) clearInterval(sweepRef.current); }, []);

  const handleGenerate = useCallback(() => {
    if (!hasPts) return;
    runSweep(activePts, truck);
  }, [hasPts, activePts, truck, runSweep]);

  const handleExport = useCallback(() => {
    if (!finalResult) return;
    const blob = new Blob([JSON.stringify({
      plan: finalResult, truckId,
      gpsPolygon: gpsPts.length >= 3 ? gpsPts : parsedManual,
      generatedAt: new Date().toISOString(),
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `gps-dump-plan-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [finalResult, truckId, gpsPts, parsedManual]);

  const handleAddCustomTruck = useCallback(() => {
    if (!customForm.name.trim()) { setCustomError("Name is required"); return; }
    const id = `custom-${customForm.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    addCustomTruck({ id, ...customForm });
    setTruckId(id);
    setCustomError(""); setShowCustomForm(false);
  }, [customForm, addCustomTruck]);

  const maxScore = Math.max(...sweepScores.map((s) => s.spotCount), 1);

  return (
    <div className="flex h-full gap-4 p-4 overflow-hidden">

      {/* ── Left controls ── */}
      <div className="flex flex-col gap-3 w-72 shrink-0 overflow-y-auto">

        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Map Layer</div>
          <div className="flex gap-2">
            {(["satellite","osm"] as const).map((l) => (
              <button key={l} onClick={() => setLayer(l)}
                className={`flex-1 py-1 text-xs rounded border ${layer===l ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}>
                {l === "satellite" ? "Satellite" : "Street"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">GPS Polygon</div>
          <div className="text-xs text-muted-foreground mb-1">
            Click map to add points, OR paste coordinates (lat, lng — one per line):
          </div>
          <textarea value={manualInput} onChange={(e) => handleManualChange(e.target.value)}
            placeholder={"lat, lng\n20.5937, 78.9629\n20.5950, 78.9700\n20.5920, 78.9710\n20.5910, 78.9630"}
            className="w-full h-24 bg-secondary border border-border rounded text-xs font-mono p-2 text-foreground placeholder:text-muted-foreground resize-none focus:border-primary outline-none"
            data-testid="gps-manual-input" />
          <div className="mt-1 flex justify-between text-xs font-mono text-muted-foreground">
            <span>{mapDisplayPts.length} point{mapDisplayPts.length !== 1 ? "s" : ""} on map</span>
            {parsedManual.length >= 2 && <span className="text-green-400">Zoomed ✓</span>}
          </div>
        </div>

        {/* Truck */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Truck</div>
          <div className="flex flex-col gap-1 mb-1">
            {allTrucks.map((t) => (
              <div key={t.id} className="flex items-center gap-1">
                <button onClick={() => setTruckId(t.id)}
                  className={`flex-1 text-left text-xs px-2 py-1.5 rounded border ${truckId===t.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:bg-muted"}`}>
                  {t.name}
                </button>
                {t.id.startsWith("custom-") && (
                  <button onClick={() => removeCustomTruck(t.id)} className="text-xs text-muted-foreground hover:text-red-400 px-1">✕</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => { setShowCustomForm((v) => !v); setCustomError(""); }}
            className="w-full text-xs py-1 border border-dashed border-border rounded hover:border-primary hover:text-primary text-muted-foreground transition-colors mt-1">
            {showCustomForm ? "Cancel" : "+ Custom Truck"}
          </button>
        </div>

        <AnimatePresence>
          {showCustomForm && (
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              className="bg-card border border-primary/30 rounded p-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Custom Truck</div>
              <div className="flex flex-col gap-1.5 text-xs">
                {([
                  ["name","Truck Name","text"],["width","Width (m)","number"],["length","Length (m)","number"],
                  ["turningRadius","Turn Radius (m)","number"],["spacingX","Spacing X (m)","number"],
                  ["spacingY","Spacing Y (m)","number"],["payloadTonnes","Payload (t)","number"],
                ] as [keyof typeof customForm, string, string][]).map(([field, label, type]) => (
                  <div key={field}>
                    <label className="text-muted-foreground block mb-0.5">{label}</label>
                    <input type={type} value={(customForm as any)[field]}
                      onChange={(e) => setCustomForm((p) => ({ ...p, [field]: type==="number" ? Number(e.target.value) : e.target.value }))}
                      className="w-full bg-secondary border border-border rounded px-2 py-1 font-mono focus:border-primary outline-none" />
                  </div>
                ))}
                {customError && <div className="text-red-400 text-[11px]">{customError}</div>}
                <button onClick={handleAddCustomTruck} className="w-full py-1.5 bg-primary text-primary-foreground rounded font-semibold">Add & Select</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="bg-card border border-border rounded p-3 flex flex-col gap-2">
          <button onClick={handleGenerate}
            disabled={sweeping || !hasPts}
            className="w-full py-2 text-sm bg-primary text-primary-foreground rounded font-semibold disabled:opacity-40 hover:opacity-90"
            data-testid="button-gps-generate">
            {sweeping ? `Scanning ${sweepAngle}°…` : !hasPts ? "Add ≥ 3 points first" : "Generate Plan"}
          </button>
          {finalResult && (
            <button onClick={handleExport}
              className="w-full py-1.5 text-xs bg-green-900/40 border border-green-700 text-green-400 rounded hover:bg-green-900/60 font-semibold">
              Export JSON
            </button>
          )}
          <button onClick={clearAll}
            className="w-full py-1.5 text-xs bg-secondary border border-border rounded hover:bg-muted">Clear All</button>
        </div>

        {/* Winner metrics */}
        <AnimatePresence>
          {finalResult && !sweeping && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              className="bg-card border border-primary/40 rounded p-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">★ Optimal Result</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span className="text-muted-foreground">Hex Spots</span>   <span className="font-mono text-primary font-bold">{finalResult.metrics.spotCount}</span>
                <span className="text-muted-foreground">Grid Spots</span>  <span className="font-mono">{finalResult.metrics.squareGridCount}</span>
                <span className="text-muted-foreground">Improvement</span> <span className="font-mono text-green-400">+{finalResult.metrics.improvementPercent.toFixed(1)}%</span>
                <span className="text-muted-foreground">Best Angle</span>  <span className="font-mono text-amber-400">{finalResult.bestRotation}°</span>
                <span className="text-muted-foreground">Lanes</span>       <span className="font-mono">{finalResult.lanes.length}</span>
                <span className="text-muted-foreground">Inset Area</span>  <span className="font-mono">{finalResult.metrics.insetArea.toFixed(0)} m²</span>
                <span className="text-muted-foreground">Total Area</span>  <span className="font-mono">{finalResult.metrics.totalArea.toFixed(0)} m²</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Right: Map (top) + Sweep canvas (bottom) ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">

        {/* Status bar */}
        <div className="text-xs shrink-0 h-4 font-mono">
          {sweeping
            ? <span className="text-amber-400">Scanning {sweepAngle}° — best so far: {bestSoFar !== null ? `${bestSoFar}°` : "—"} ({sweepResults.find((r) => r.bestRotation === bestSoFar)?.metrics.spotCount ?? "—"} spots)</span>
            : finalResult
            ? <span className="text-green-400">★ Optimal: {finalResult.bestRotation}° → {finalResult.metrics.spotCount} spots (+{finalResult.metrics.improvementPercent.toFixed(1)}% vs grid)</span>
            : <span className="text-muted-foreground">{hasPts ? "Click Generate Plan to run optimization" : "Click map to add points, or paste coordinates on the left"}</span>}
        </div>

        {/* Map */}
        <div className={`rounded overflow-hidden border border-border ${(sweeping || liveResult) ? "flex-[0_0_45%]" : "flex-1"}`}>
          {leafletReady
            ? <LeafletMap points={mapDisplayPts} onAddPoint={addPoint} layer={layer} fitTo={fitTo} />
            : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading map…</div>
          }
        </div>

        {/* Live sweep canvas — appears once generation starts */}
        <AnimatePresence>
          {(sweeping || liveResult) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col gap-2 min-h-0">

              <div className="text-[10px] font-mono text-muted-foreground uppercase">
                Sweep Canvas — live spot animation at each angle
                {finalResult && <span className="text-primary ml-2">★ Winner: {finalResult.bestRotation}° ({finalResult.metrics.spotCount} spots)</span>}
              </div>

              {/* Main sweep canvas */}
              <div className="flex-1 bg-[#0b0e15] border border-border rounded overflow-hidden" style={{ minHeight: 160 }}>
                {liveResult && (
                  <PackingCanvas
                    polygon={liveResult.polygon}
                    insetPolygon={liveResult.insetPolygon}
                    spots={liveResult.spots}
                    lanes={liveResult.lanes}
                    isClosed
                    sweepAngle={sweeping ? sweepAngle : null}
                    readOnly
                  />
                )}
              </div>

              {/* Sweep bar chart */}
              {sweepScores.length > 0 && (
                <div className="bg-card border border-border rounded px-3 pt-2 pb-1 shrink-0">
                  <div className="flex items-end gap-0.5 h-10">
                    {sweepScores.map((s) => {
                      const h = Math.max(4, Math.round((s.spotCount / maxScore) * 32));
                      const isBest    = !sweeping && s.angle === finalResult?.bestRotation;
                      const isCurrent = sweeping && s.angle === sweepAngle;
                      const isSoFar   = sweeping && s.angle === bestSoFar;
                      return (
                        <div key={s.angle} className="flex flex-col items-center gap-0.5 flex-1 min-w-0"
                          title={`${s.angle}°: ${s.spotCount} spots`}>
                          <motion.div initial={{ height: 0 }} animate={{ height: h }}
                            className={`w-full rounded-t ${isBest ? "bg-primary" : isCurrent ? "bg-white" : isSoFar ? "bg-amber-400" : "bg-slate-600"}`} />
                          <span className="text-[7px] text-muted-foreground font-mono">{s.angle}°</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
