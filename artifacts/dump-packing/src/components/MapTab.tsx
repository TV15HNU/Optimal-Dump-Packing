import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useGeneratePackGps } from "@workspace/api-client-react";

interface GpsPt { lat: number; lng: number; }

function LeafletMapInner({
  points, onAddPoint, layer,
}: { points: GpsPt[]; onAddPoint: (lat: number, lng: number) => void; layer: "satellite" | "osm" }) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const polyRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    import("leaflet").then((L) => {
      const Ldef = L.default;
      // Fix default icon
      delete (Ldef.Icon.Default.prototype as any)._getIconUrl;
      Ldef.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
      const map = Ldef.map(containerRef.current!, { center: [-23.5, 134.0], zoom: 13 });
      mapRef.current = map;
      const sat = Ldef.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Esri World Imagery",
      });
      const osm = Ldef.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      });
      (layer === "satellite" ? sat : osm).addTo(map);
      (map as any)._tileLayerSat = sat;
      (map as any)._tileLayerOsm = osm;
      map.on("click", (e: any) => { onAddPoint(e.latlng.lat, e.latlng.lng); });
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Update tile layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sat = map._tileLayerSat;
    const osm = map._tileLayerOsm;
    if (layer === "satellite") { if (osm) map.removeLayer(osm); if (sat) sat.addTo(map); }
    else { if (sat) map.removeLayer(sat); if (osm) osm.addTo(map); }
  }, [layer]);

  // Update markers and polygon
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then((L) => {
      const Ldef = L.default;
      // Remove old markers
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = points.map((p) => Ldef.marker([p.lat, p.lng]).addTo(map));
      // Update polygon
      if (polyRef.current) map.removeLayer(polyRef.current);
      if (points.length >= 3) {
        polyRef.current = Ldef.polygon(
          points.map((p) => [p.lat, p.lng] as [number, number]),
          { color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.15, weight: 2 }
        ).addTo(map);
      }
    });
  }, [points]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}

export default function MapTab() {
  const [gpsPts, setGpsPts] = useState<GpsPt[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [truckId, setTruckId] = useState("cat-793");
  const [layer, setLayer] = useState<"satellite" | "osm">("satellite");
  const [leafletReady, setLeafletReady] = useState(false);
  const generateMutation = useGeneratePackGps();

  useEffect(() => {
    import("leaflet/dist/leaflet.css" as string).catch(() => {});
    import("leaflet").then(() => setLeafletReady(true)).catch(() => {});
  }, []);

  const addPoint = useCallback((lat: number, lng: number) => {
    setGpsPts((prev) => [...prev, { lat, lng }]);
  }, []);

  function parseManual(text: string): GpsPt[] {
    return text.trim().split("\n")
      .map((line) => { const [lat, lng] = line.split(",").map(Number); return { lat, lng }; })
      .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
  }

  const handleGenerate = async () => {
    const pts = gpsPts.length >= 3 ? gpsPts : parseManual(manualInput);
    if (pts.length < 3) return;
    try {
      const plan = await generateMutation.mutateAsync({
        data: { gpsPolygon: pts, truckProfileId: truckId }
      });
      setResult(plan);
    } catch { /* errors shown via mutation.isError */ }
  };

  const handleClear = () => { setGpsPts([]); setResult(null); };

  const trucks = [
    { id: "cat-793", name: "CAT 793" },
    { id: "cat-797f", name: "CAT 797F" },
    { id: "cat-789d", name: "CAT 789D" },
    { id: "komatsu-930e", name: "Komatsu 930E" },
  ];

  return (
    <div className="flex h-full gap-4 p-4 overflow-hidden">
      {/* Left controls */}
      <div className="flex flex-col gap-3 w-72 shrink-0 overflow-y-auto">
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">GPS Polygon</div>
          <div className="text-xs text-muted-foreground mb-2">
            Click on the map to add polygon vertices, or enter coordinates below.
          </div>
          <div className="text-xs text-muted-foreground mb-1">Manual GPS input (lat,lng per line)</div>
          <textarea
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder={"-23.5012, 134.2345\n-23.5008, 134.2390\n-23.5020, 134.2400"}
            className="w-full h-24 bg-secondary border border-border rounded text-xs font-mono p-2 text-foreground placeholder:text-muted-foreground resize-none"
            data-testid="gps-manual-input"
          />
          <div className="mt-2">
            <label className="text-xs text-muted-foreground block mb-1">Truck</label>
            <select
              value={truckId}
              onChange={(e) => setTruckId(e.target.value)}
              className="w-full bg-secondary border border-border rounded text-xs px-2 py-1.5 text-foreground"
              data-testid="gps-truck-select"
            >
              {trucks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || (gpsPts.length < 3 && parseManual(manualInput).length < 3)}
              className="flex-1 py-1.5 text-xs bg-primary text-primary-foreground rounded font-semibold disabled:opacity-40 hover:opacity-90"
              data-testid="button-gps-generate"
            >{generateMutation.isPending ? "Optimizing..." : "Generate Plan"}</button>
            <button onClick={handleClear} className="py-1.5 px-3 text-xs bg-secondary border border-border rounded" data-testid="button-gps-clear">Clear</button>
          </div>
          {generateMutation.isError && (
            <div className="text-xs text-red-400 mt-2">Error generating plan. Check GPS coordinates.</div>
          )}
          <div className="mt-2 text-xs text-muted-foreground font-mono">{gpsPts.length} map points</div>
        </div>

        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-primary/30 rounded p-3">
            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">GPS Plan Result</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <span className="text-muted-foreground">Spots</span>
              <span className="font-mono text-primary font-bold">{result.metrics?.spotCount}</span>
              <span className="text-muted-foreground">Grid Count</span>
              <span className="font-mono">{result.metrics?.squareGridCount}</span>
              <span className="text-muted-foreground">Improvement</span>
              <span className="font-mono text-green-400">+{result.metrics?.improvementPercent?.toFixed(1)}%</span>
              <span className="text-muted-foreground">Best Angle</span>
              <span className="font-mono">{result.bestRotation}°</span>
              <span className="text-muted-foreground">Inset Area</span>
              <span className="font-mono">{result.metrics?.insetArea?.toFixed(0)}m²</span>
            </div>
          </motion.div>
        )}

        <div className="bg-card border border-border rounded p-3 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground mb-1">About GPS Mode</div>
          <p className="leading-relaxed">
            GPS coordinates are projected into a local metric coordinate system using equirectangular projection
            centered on the polygon centroid. The optimization runs identically to local polygon mode.
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setLayer("satellite")} className={`text-xs px-3 py-1.5 rounded border ${layer === "satellite" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground"}`}>
            Satellite
          </button>
          <button onClick={() => setLayer("osm")} className={`text-xs px-3 py-1.5 rounded border ${layer === "osm" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground"}`}>
            Street Map
          </button>
          <span className="ml-auto self-center text-xs text-muted-foreground">Click map to add vertices</span>
        </div>
        <div className="flex-1 rounded overflow-hidden border border-border" style={{ minHeight: 0 }}>
          {leafletReady ? (
            <LeafletMapInner points={gpsPts} onAddPoint={addPoint} layer={layer} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading map...</div>
          )}
        </div>
      </div>
    </div>
  );
}
