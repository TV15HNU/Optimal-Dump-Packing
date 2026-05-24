import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  runAtAngle, projectToNearestEdge, fillGaps, DEFAULT_TRUCKS,
  type TruckConfig, type RotScore, type LocalPackResult, type Pt, type SpotLocal,
} from "@/engine/localEngine";
import { usePlanContext } from "@/lib/planContext";
import type { GpsPt } from "@/lib/planContext";
import PackingCanvas from "./PackingCanvas";

// ── GPS math ──────────────────────────────────────────────────────────────────
const R_EARTH = 6371000;

interface GpsOrigin { lat0Rad: number; lng0Rad: number; }

function computeGpsOrigin(pts: GpsPt[]): GpsOrigin {
  return {
    lat0Rad: (pts.reduce((s, p) => s + p.lat, 0) / pts.length) * Math.PI / 180,
    lng0Rad: (pts.reduce((s, p) => s + p.lng, 0) / pts.length) * Math.PI / 180,
  };
}

function gpsToLocalWithOrigin(pts: GpsPt[], o: GpsOrigin): Pt[] {
  return pts.map((p) => ({
    x: (p.lng * Math.PI / 180 - o.lng0Rad) * R_EARTH * Math.cos(o.lat0Rad),
    y: (p.lat * Math.PI / 180 - o.lat0Rad) * R_EARTH,
  }));
}

function localToGps(pt: Pt, o: GpsOrigin): GpsPt {
  return {
    lat: (o.lat0Rad + pt.y / R_EARTH) * 180 / Math.PI,
    lng: (o.lng0Rad + pt.x / (R_EARTH * Math.cos(o.lat0Rad))) * 180 / Math.PI,
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const INDIA_ZOOM = 5;
const SWEEP_MS = 200;
const LANE_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#a855f7",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

interface SpotMarkerData {
  lat: number; lng: number;
  id: number; laneId: number;
  localX: number; localY: number;
  sequenceInLane: number; globalSequence: number;
  zoneId: number;
}

// ── Leaflet map component ─────────────────────────────────────────────────────
function LeafletMap({
  polygonPts, onMapClick, layer, fitTo,
  spotMarkers = [], insetPolyGps = [],
  entryGps, exitGps, onSpotClick,
}: {
  polygonPts: GpsPt[];
  onMapClick: (lat: number, lng: number) => void;
  layer: "satellite" | "osm";
  fitTo: GpsPt[] | null;
  spotMarkers?: SpotMarkerData[];
  insetPolyGps?: GpsPt[];
  entryGps?: GpsPt | null;
  exitGps?: GpsPt | null;
  onSpotClick?: (data: SpotMarkerData) => void;
}) {
  const [mapReady, setMapReady] = useState(false);
  const containerRef     = useRef<HTMLDivElement>(null);
  const mapRef           = useRef<any>(null);
  const layerRef         = useRef<any>({ sat: null, osm: null });
  const polyMarkersRef   = useRef<any[]>([]);
  const polyLineRef      = useRef<any>(null);
  const insetLineRef     = useRef<any>(null);
  const spotGroupRef     = useRef<any>(null);
  const entryMarkerRef   = useRef<any>(null);
  const exitMarkerRef    = useRef<any>(null);
  const onMapClickRef    = useRef(onMapClick);
  const onSpotClickRef   = useRef(onSpotClick);
  onMapClickRef.current  = onMapClick;
  onSpotClickRef.current = onSpotClick;

  // Init once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    import("leaflet").then((L) => {
      const Ldef = L.default;
      delete (Ldef.Icon.Default.prototype as any)._getIconUrl;
      const map = Ldef.map(containerRef.current!, { center: INDIA_CENTER, zoom: INDIA_ZOOM });
      mapRef.current = map;
      setMapReady(true);
      const sat = Ldef.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Esri", maxZoom: 19 }
      );
      const osm = Ldef.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { attribution: "OSM", maxZoom: 19 }
      );
      layerRef.current = { sat, osm };
      sat.addTo(map);
      map.on("click", (e: any) => onMapClickRef.current(e.latlng.lat, e.latlng.lng));
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Layer switch
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const { sat, osm } = layerRef.current;
    if (layer === "satellite") { try { map.removeLayer(osm); } catch {} sat?.addTo(map); }
    else                       { try { map.removeLayer(sat); } catch {} osm?.addTo(map); }
  }, [layer]);

  // Polygon vertex markers + outer polygon
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    import("leaflet").then((L) => {
      const Ldef = L.default;
      polyMarkersRef.current.forEach((m) => { try { map.removeLayer(m); } catch {} });
      if (polyLineRef.current) { try { map.removeLayer(polyLineRef.current); } catch {} polyLineRef.current = null; }
      polyMarkersRef.current = polygonPts.map((p) =>
        Ldef.circleMarker([p.lat, p.lng], { radius: 7, color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.9, weight: 2 }).addTo(map)
      );
      if (polygonPts.length >= 3) {
        polyLineRef.current = Ldef.polygon(
          polygonPts.map((p) => [p.lat, p.lng] as [number, number]),
          { color: "#94a3b8", fillColor: "#94a3b8", fillOpacity: 0.08, weight: 2 }
        ).addTo(map);
      }
    });
  }, [polygonPts, mapReady]);

  // Inset polygon (dashed amber)
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    import("leaflet").then((L) => {
      if (insetLineRef.current) { try { map.removeLayer(insetLineRef.current); } catch {} insetLineRef.current = null; }
      if (insetPolyGps.length < 3) return;
      insetLineRef.current = L.default.polygon(
        insetPolyGps.map((p) => [p.lat, p.lng] as [number, number]),
        { color: "#f59e0b", fill: false, weight: 1.5, dashArray: "6 4", opacity: 0.7 }
      ).addTo(map);
    });
  }, [insetPolyGps, mapReady]);

  // Spot markers — FeatureGroup stays through pan/zoom
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    import("leaflet").then((L) => {
      const Ldef = L.default;
      if (spotGroupRef.current) { try { map.removeLayer(spotGroupRef.current); } catch {} spotGroupRef.current = null; }
      if (spotMarkers.length === 0) return;
      const group = Ldef.featureGroup();
      for (const s of spotMarkers) {
        const color = s.zoneId === 1 ? "#ffffff" : LANE_COLORS[Math.max(0, s.laneId) % LANE_COLORS.length];
        const cm = Ldef.circleMarker([s.lat, s.lng], {
          radius: 6, color, fillColor: color, fillOpacity: s.zoneId === 1 ? 0.5 : 0.85, weight: 1.5,
        });
        cm.on("click", (e: any) => {
          Ldef.DomEvent.stopPropagation(e);
          onSpotClickRef.current?.(s);
        });
        cm.bindTooltip(`Spot #${s.globalSequence + 1} | Lane ${s.laneId < 0 ? "gap" : s.laneId}`, {
          sticky: true, offset: [0, -8],
        });
        group.addLayer(cm);
      }
      group.addTo(map);
      spotGroupRef.current = group;
    });
  }, [spotMarkers, mapReady]);

  // Entry marker
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    import("leaflet").then((L) => {
      const Ldef = L.default;
      if (entryMarkerRef.current) { try { map.removeLayer(entryMarkerRef.current); } catch {} entryMarkerRef.current = null; }
      if (!entryGps) return;
      entryMarkerRef.current = Ldef.circleMarker([entryGps.lat, entryGps.lng], {
        radius: 11, color: "#059669", fillColor: "#10b981", fillOpacity: 0.95, weight: 3,
      }).bindTooltip("IN", { permanent: true, direction: "top" }).addTo(map);
    });
  }, [entryGps, mapReady]);

  // Exit marker
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    import("leaflet").then((L) => {
      const Ldef = L.default;
      if (exitMarkerRef.current) { try { map.removeLayer(exitMarkerRef.current); } catch {} exitMarkerRef.current = null; }
      if (!exitGps) return;
      exitMarkerRef.current = Ldef.circleMarker([exitGps.lat, exitGps.lng], {
        radius: 11, color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.95, weight: 3,
      }).bindTooltip("OUT", { permanent: true, direction: "top" }).addTo(map);
    });
  }, [exitGps, mapReady]);

  // Fly to bounds
  useEffect(() => {
    const map = mapRef.current; if (!map || !fitTo || fitTo.length < 2) return;
    import("leaflet").then((L) => {
      const bounds = L.default.latLngBounds(fitTo.map((p) => [p.lat, p.lng] as [number, number]));
      map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 16, duration: 1 });
    });
  }, [fitTo, mapReady]);

  return <div ref={containerRef} className="h-full w-full" />;
}

// ── MapTab ────────────────────────────────────────────────────────────────────
type MapEEPhase = "idle" | "entry" | "exit" | "done";

export default function MapTab() {
  const {
    setMapPlan, setMapEntryPoint, setMapExitPoint, setMapGpsPts,
    mapPlan: ctxMapPlan, mapGpsPts: ctxMapGpsPts,
    mapEntryPoint: ctxMapEntryPoint, mapExitPoint: ctxMapExitPoint,
    customTrucks, addCustomTruck, removeCustomTruck,
  } = usePlanContext();

  const [gpsPts, setGpsPts]             = useState<GpsPt[]>([]);
  const [manualInput, setManualInput]   = useState("");
  const [parsedManual, setParsedManual] = useState<GpsPt[]>([]);
  const [truckId, setTruckId]           = useState("cat-793");
  const [layer, setLayer]               = useState<"satellite" | "osm">("satellite");
  const [leafletReady, setLeafletReady] = useState(false);
  const [fitTo, setFitTo]               = useState<GpsPt[] | null>(null);

  // Sweep state
  const [sweeping, setSweeping]         = useState(false);
  const [sweepAngle, setSweepAngle]     = useState<number | null>(null);
  const [sweepScores, setSweepScores]   = useState<RotScore[]>([]);
  const [sweepResults, setSweepResults] = useState<LocalPackResult[]>([]);
  const [bestSoFar, setBestSoFar]       = useState<number | null>(null);
  const [finalResult, setFinalResult]   = useState<LocalPackResult | null>(null);
  const [liveResult, setLiveResult]     = useState<LocalPackResult | null>(null);
  const sweepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // GPS origin for back-projection
  const [gpsOrigin, setGpsOrigin] = useState<GpsOrigin | null>(null);

  // Entry/exit state
  const [mapEEPhase, setMapEEPhase]   = useState<MapEEPhase>("idle");
  const [entryGps, setEntryGps]       = useState<GpsPt | null>(null);
  const [exitGps, setExitGps]         = useState<GpsPt | null>(null);
  const [localEntry, setLocalEntry]   = useState<Pt | null>(null);

  // Manual entry/exit coordinate inputs
  const [entryInput, setEntryInput]   = useState("");
  const [exitInput, setExitInput]     = useState("");
  const [eeInputError, setEeInputError] = useState("");

  // Gap fill
  const [gapFilled, setGapFilled]     = useState(false);
  const [gapFillCount, setGapFillCount] = useState(0);

  // Selected spot info panel
  const [selectedSpot, setSelectedSpot] = useState<SpotMarkerData | null>(null);

  // Custom truck form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState<Omit<TruckConfig, "id">>({
    name: "", width: 9, length: 14, turningRadius: 12, spacingX: 13.5, spacingY: 13.5, payloadTonnes: 200,
  });
  const [customError, setCustomError] = useState("");

  // Import error
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allTrucks: TruckConfig[] = [...DEFAULT_TRUCKS, ...customTrucks];
  const truck = allTrucks.find((t) => t.id === truckId) ?? DEFAULT_TRUCKS[0];

  useEffect(() => {
    import("leaflet/dist/leaflet.css" as string).catch(() => {});
    import("leaflet").then(() => setLeafletReady(true)).catch(() => {});
  }, []);

  // Sync from context on mount — handles plan imported via Export/Import tab
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ctxMapPlan || !ctxMapGpsPts || ctxMapGpsPts.length < 3) return;
    const origin = computeGpsOrigin(ctxMapGpsPts);
    setGpsPts(ctxMapGpsPts);
    setFitTo(ctxMapGpsPts);
    setGpsOrigin(origin);
    setFinalResult(ctxMapPlan);
    setLiveResult(ctxMapPlan);
    setSweepScores([]);
    setSweepResults([]);
    setSelectedSpot(null);
    let phase: MapEEPhase = "idle";
    if (ctxMapEntryPoint) {
      setEntryGps(localToGps(ctxMapEntryPoint, origin));
      setLocalEntry(ctxMapEntryPoint);
      phase = "exit";
    }
    if (ctxMapExitPoint) {
      setExitGps(localToGps(ctxMapExitPoint, origin));
      phase = "done";
    }
    setMapEEPhase(phase);
  }, []); // Intentionally only on mount

  // Active polygon for optimization
  const activePts: GpsPt[] = gpsPts.length >= 3 ? gpsPts : parsedManual;
  const mapDisplayPts: GpsPt[] = gpsPts.length > 0 ? gpsPts : parsedManual;
  const hasPts = activePts.length >= 3;

  // Convert final spots → GPS for Leaflet overlay
  const spotMarkersGps = useMemo((): SpotMarkerData[] => {
    if (!finalResult || !gpsOrigin) return [];
    return finalResult.spots.map((s) => ({
      ...localToGps({ x: s.x, y: s.y }, gpsOrigin),
      id: s.id, laneId: s.laneId,
      localX: s.x, localY: s.y,
      sequenceInLane: s.sequenceInLane,
      globalSequence: s.globalSequence,
      zoneId: s.zoneId,
    }));
  }, [finalResult, gpsOrigin]);

  // Convert inset polygon → GPS
  const insetPolyGps = useMemo((): GpsPt[] => {
    if (!finalResult?.insetPolygon || !gpsOrigin) return [];
    return finalResult.insetPolygon.map((p) => localToGps(p, gpsOrigin));
  }, [finalResult, gpsOrigin]);

  const clearAll = useCallback(() => {
    setGpsPts([]); setParsedManual([]); setManualInput("");
    setFinalResult(null); setLiveResult(null);
    setSweepScores([]); setSweepResults([]);
    setSweeping(false); setSweepAngle(null); setBestSoFar(null);
    setGpsOrigin(null);
    setMapEEPhase("idle"); setEntryGps(null); setExitGps(null); setLocalEntry(null);
    setEntryInput(""); setExitInput(""); setEeInputError("");
    setGapFilled(false); setGapFillCount(0);
    setSelectedSpot(null); setImportError("");
    if (sweepRef.current) { clearInterval(sweepRef.current); sweepRef.current = null; }
    setFitTo(null);
    setMapPlan(null); setMapEntryPoint(null); setMapExitPoint(null); setMapGpsPts([]);
  }, [setMapPlan, setMapEntryPoint, setMapExitPoint, setMapGpsPts]);

  const runSweep = useCallback((pts: GpsPt[], t: TruckConfig) => {
    const origin = computeGpsOrigin(pts);
    const localPts = gpsToLocalWithOrigin(pts, origin);
    if (localPts.length < 3) return;
    if (sweepRef.current) { clearInterval(sweepRef.current); sweepRef.current = null; }

    setGpsOrigin(origin);
    setSweeping(true); setSweepScores([]); setSweepResults([]);
    setBestSoFar(null); setFinalResult(null); setLiveResult(null);
    setMapEEPhase("idle"); setEntryGps(null); setExitGps(null); setLocalEntry(null);
    setSelectedSpot(null);

    const angles: number[] = [];
    for (let a = 0; a < 60; a += 1) angles.push(a);

    let idx = 0;
    let localScores: RotScore[] = [], localResults: LocalPackResult[] = [];
    let localBestCount = 0, localBestAngle = 0;

    sweepRef.current = setInterval(() => {
      if (idx >= angles.length) {
        clearInterval(sweepRef.current!); sweepRef.current = null;
        const best = localResults.reduce((a, b) => a.metrics.spotCount >= b.metrics.spotCount ? a : b, localResults[0]);
        setSweeping(false); setSweepAngle(null);
        setFinalResult(best); setLiveResult(best);
        setMapPlan(best);
        setMapGpsPts(pts);
        setMapEEPhase("entry");
        return;
      }
      const a = angles[idx];
      const r = runAtAngle(localPts, t, a);
      localScores  = [...localScores,  { angle: a, spotCount: r.metrics.spotCount }];
      localResults = [...localResults, r];
      setSweepScores([...localScores]);
      setSweepResults([...localResults]);
      setSweepAngle(a);
      setLiveResult(r);
      if (r.metrics.spotCount > localBestCount) {
        localBestCount = r.metrics.spotCount; localBestAngle = a; setBestSoFar(localBestAngle);
      }
      idx++;
    }, SWEEP_MS);
  }, [setMapPlan, setMapGpsPts]);

  useEffect(() => () => { if (sweepRef.current) clearInterval(sweepRef.current); }, []);

  const handleManualChange = useCallback((text: string) => {
    setManualInput(text);
    const parsed = text.trim().split("\n")
      .map((line) => {
        const parts = line.split(",");
        const lat = parseFloat(parts[0]), lng = parseFloat(parts[1]);
        return { lat, lng };
      })
      .filter((p) => !isNaN(p.lat) && !isNaN(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180);
    setParsedManual(parsed);
    if (parsed.length >= 2) setFitTo(parsed);
  }, []);

  // Unified map click handler: routes to entry/exit OR polygon drawing
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (mapEEPhase === "entry" || mapEEPhase === "exit") {
      if (!gpsOrigin || !finalResult) return;
      const localClick = gpsToLocalWithOrigin([{ lat, lng }], gpsOrigin)[0];
      const snapped    = projectToNearestEdge(localClick, finalResult.polygon);
      const snappedGps = localToGps(snapped, gpsOrigin);

      if (mapEEPhase === "entry") {
        setEntryGps(snappedGps); setLocalEntry(snapped);
        setMapEntryPoint(snapped);
        setMapEEPhase("exit");
      } else {
        setExitGps(snappedGps);
        setMapExitPoint(snapped);
        setMapEEPhase("done");
        const updated = { ...finalResult, entryPoint: localEntry, exitPoint: snapped };
        setFinalResult(updated); setMapPlan(updated);
      }
      return;
    }
    // Only add polygon points before optimization
    if (!finalResult && !sweeping) {
      setGpsPts((p) => [...p, { lat, lng }]);
    }
  }, [mapEEPhase, gpsOrigin, finalResult, localEntry, sweeping, setMapEntryPoint, setMapExitPoint, setMapPlan]);

  const handleGenerate = useCallback(() => {
    if (!hasPts) return;
    setGapFilled(false); setGapFillCount(0);
    runSweep(activePts, truck);
  }, [hasPts, activePts, truck, runSweep]);

  const handleFillGaps = useCallback(() => {
    if (!finalResult || gapFilled) return;
    const gapPts = fillGaps(finalResult.insetPolygon, finalResult.spots, truck);
    if (gapPts.length === 0) { setGapFilled(true); setGapFillCount(0); return; }
    const baseId = finalResult.spots.length;
    const gapSpots: SpotLocal[] = gapPts.map((p, i) => ({
      id: baseId + i, x: p.x, y: p.y,
      laneId: -1, sequenceInLane: i, globalSequence: baseId + i,
      zoneId: 1, rotation: finalResult.bestRotation, safe: true,
    }));
    const totalSpots = finalResult.spots.length + gapSpots.length;
    const updated: LocalPackResult = {
      ...finalResult,
      spots: [...finalResult.spots, ...gapSpots],
      metrics: {
        ...finalResult.metrics,
        spotCount: totalSpots,
        improvementPercent: finalResult.metrics.squareGridCount > 0
          ? ((totalSpots - finalResult.metrics.squareGridCount) / finalResult.metrics.squareGridCount) * 100 : 0,
      },
    };
    setFinalResult(updated); setLiveResult(updated); setMapPlan(updated);
    setGapFilled(true); setGapFillCount(gapSpots.length);
  }, [finalResult, gapFilled, truck, setMapPlan]);

  const applyCoordEE = useCallback(() => {
    setEeInputError("");
    if (!gpsOrigin || !finalResult) { setEeInputError("Generate a plan first"); return; }

    const parseCoord = (s: string): GpsPt | null => {
      const parts = s.trim().split(/[,\s]+/);
      if (parts.length < 2) return null;
      const lat = parseFloat(parts[0]), lng = parseFloat(parts[1]);
      if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
      return { lat, lng };
    };

    const entryParsed = entryInput.trim() ? parseCoord(entryInput) : null;
    const exitParsed = exitInput.trim() ? parseCoord(exitInput) : null;

    if (entryInput.trim() && !entryParsed) { setEeInputError("Invalid entry coordinates (lat, lng)"); return; }
    if (exitInput.trim() && !exitParsed) { setEeInputError("Invalid exit coordinates (lat, lng)"); return; }

    let updatedResult = { ...finalResult };
    let newLocalEntry: Pt | null = localEntry;

    if (entryParsed) {
      const localClick = gpsToLocalWithOrigin([entryParsed], gpsOrigin)[0];
      const snapped = projectToNearestEdge(localClick, finalResult.polygon);
      const snappedGps = localToGps(snapped, gpsOrigin);
      setEntryGps(snappedGps); newLocalEntry = snapped; setLocalEntry(snapped);
      setMapEntryPoint(snapped);
      updatedResult = { ...updatedResult, entryPoint: snapped };
    }

    if (exitParsed) {
      const localClick = gpsToLocalWithOrigin([exitParsed], gpsOrigin)[0];
      const snapped = projectToNearestEdge(localClick, finalResult.polygon);
      const snappedGps = localToGps(snapped, gpsOrigin);
      setExitGps(snappedGps);
      setMapExitPoint(snapped);
      updatedResult = { ...updatedResult, exitPoint: snapped };
    }

    setFinalResult(updatedResult); setMapPlan(updatedResult);
    setMapEEPhase(entryParsed && exitParsed ? "done" : entryParsed ? "exit" : "entry");
  }, [gpsOrigin, finalResult, entryInput, exitInput, localEntry, setMapEntryPoint, setMapExitPoint, setMapPlan]);

  const handleAddCustomTruck = useCallback(() => {
    if (!customForm.name.trim()) { setCustomError("Name is required"); return; }
    const id = `custom-${customForm.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    addCustomTruck({ id, ...customForm });
    setTruckId(id);
    setCustomError(""); setShowCustomForm(false);
  }, [customForm, addCustomTruck]);

  const handleImportPlan = useCallback((file: File) => {
    setImportError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target!.result as string);
        if (!Array.isArray(data.gpsPolygon) || !Array.isArray(data.plan?.spots)) {
          setImportError("Invalid plan: needs gpsPolygon and plan.spots arrays"); return;
        }
        const gps    = data.gpsPolygon as GpsPt[];
        const plan   = data.plan as LocalPackResult;
        const origin = computeGpsOrigin(gps);

        setGpsPts(gps); setFitTo(gps);
        setGpsOrigin(origin);
        setFinalResult(plan); setLiveResult(plan);
        setSweepScores([]); setSweepResults([]);
        setMapPlan(plan); setMapGpsPts(gps);
        setSelectedSpot(null);

        let phase: MapEEPhase = "idle";
        if (plan.entryPoint) {
          const eg = localToGps(plan.entryPoint, origin);
          setEntryGps(eg); setLocalEntry(plan.entryPoint);
          setMapEntryPoint(plan.entryPoint); phase = "exit";
        }
        if (plan.exitPoint) {
          const xg = localToGps(plan.exitPoint, origin);
          setExitGps(xg); setMapExitPoint(plan.exitPoint); phase = "done";
        }
        setMapEEPhase(phase);
      } catch {
        setImportError("Failed to parse file — ensure it is a valid plan JSON");
      }
    };
    reader.readAsText(file);
  }, [setMapPlan, setMapGpsPts, setMapEntryPoint, setMapExitPoint]);

  const resetEE = useCallback(() => {
    setMapEEPhase("entry"); setEntryGps(null); setExitGps(null); setLocalEntry(null);
    setMapEntryPoint(null); setMapExitPoint(null);
    if (finalResult) {
      const reset = { ...finalResult, entryPoint: null, exitPoint: null };
      setFinalResult(reset); setMapPlan(reset);
    }
  }, [finalResult, setMapEntryPoint, setMapExitPoint, setMapPlan]);

  const maxScore = Math.max(...sweepScores.map((s) => s.spotCount), 1);

  const statusBar = sweeping
    ? <span className="text-amber-400">Scanning {sweepAngle}° — best so far: {bestSoFar !== null ? `${bestSoFar}°` : "—"} ({sweepResults.find((r) => r.bestRotation === bestSoFar)?.metrics.spotCount ?? "—"} spots)</span>
    : mapEEPhase === "entry"
    ? <span className="text-green-400 animate-pulse">✓ Optimal {finalResult?.bestRotation}° → {finalResult?.metrics.spotCount} spots · Click ENTRY point on the polygon boundary</span>
    : mapEEPhase === "exit"
    ? <span className="text-red-400 animate-pulse">Entry set ✓ · Click EXIT point on the polygon boundary</span>
    : mapEEPhase === "done"
    ? <span className="text-primary">★ {finalResult?.bestRotation}° · {finalResult?.metrics.spotCount} spots · Entry & Exit set ✓</span>
    : finalResult
    ? <span className="text-green-400">★ Optimal: {finalResult.bestRotation}° → {finalResult.metrics.spotCount} spots (+{finalResult.metrics.improvementPercent.toFixed(1)}%)</span>
    : <span className="text-muted-foreground">{hasPts ? "Click Generate Plan to run optimization" : "Click map to add points, or paste coordinates"}</span>;

  return (
    <div className="flex h-full gap-4 p-4 overflow-hidden">

      {/* ── Left controls ── */}
      <div className="flex flex-col gap-3 w-72 shrink-0 overflow-y-auto">

        {/* Layer toggle */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Map Layer</div>
          <div className="flex gap-2">
            {(["satellite", "osm"] as const).map((l) => (
              <button key={l} onClick={() => setLayer(l)}
                className={`flex-1 py-1.5 text-xs rounded border ${layer === l ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:bg-muted"}`}>
                {l === "satellite" ? "Satellite" : "Street"}
              </button>
            ))}
          </div>
        </div>

        {/* GPS polygon input */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">GPS Polygon</div>
          <div className="text-xs text-muted-foreground mb-1">Click map to add points, or paste coords (lat, lng — one per line):</div>
          <textarea value={manualInput} onChange={(e) => handleManualChange(e.target.value)}
            placeholder={"lat, lng\n20.5937, 78.9629\n20.5950, 78.9700\n20.5920, 78.9710"}
            className="w-full h-24 bg-secondary border border-border rounded text-xs font-mono p-2 text-foreground placeholder:text-muted-foreground resize-none focus:border-primary outline-none"
            data-testid="gps-manual-input" />
          <div className="mt-1 flex justify-between text-xs font-mono text-muted-foreground">
            <span>{mapDisplayPts.length} pt{mapDisplayPts.length !== 1 ? "s" : ""} on map</span>
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
                  className={`flex-1 text-left text-xs px-2 py-1.5 rounded border ${truckId === t.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:bg-muted"}`}>
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
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-card border border-primary/30 rounded p-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Custom Truck</div>
              <div className="flex flex-col gap-1.5 text-xs">
                {([
                  ["name", "Truck Name", "text"], ["width", "Width (m)", "number"], ["length", "Length (m)", "number"],
                  ["turningRadius", "Turn Radius (m)", "number"], ["spacingX", "Spacing X (m)", "number"],
                  ["spacingY", "Spacing Y (m)", "number"], ["payloadTonnes", "Payload (t)", "number"],
                ] as [keyof typeof customForm, string, string][]).map(([field, label, type]) => (
                  <div key={field}>
                    <label className="text-muted-foreground block mb-0.5">{label}</label>
                    <input type={type} value={(customForm as any)[field]}
                      onChange={(e) => setCustomForm((p) => ({ ...p, [field]: type === "number" ? Number(e.target.value) : e.target.value }))}
                      className="w-full bg-secondary border border-border rounded px-2 py-1 font-mono focus:border-primary outline-none" />
                  </div>
                ))}
                {customError && <div className="text-red-400 text-[11px]">{customError}</div>}
                <button onClick={handleAddCustomTruck} className="w-full py-1.5 bg-primary text-primary-foreground rounded font-semibold">Add & Select</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Entry/exit phase info */}
        <AnimatePresence>
          {(mapEEPhase !== "idle" || entryGps || exitGps) && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-card border border-primary/30 rounded p-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Entry / Exit</div>
              <div className="space-y-1.5 text-xs mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${entryGps ? "bg-green-500" : "bg-border"}`} />
                  <span className={entryGps ? "text-green-400 font-mono text-[11px]" : "text-muted-foreground"}>
                    {entryGps ? `Entry (${entryGps.lat.toFixed(5)}, ${entryGps.lng.toFixed(5)})` : "Entry: click boundary"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${exitGps ? "bg-red-500" : "bg-border"}`} />
                  <span className={exitGps ? "text-red-400 font-mono text-[11px]" : "text-muted-foreground"}>
                    {exitGps ? `Exit (${exitGps.lat.toFixed(5)}, ${exitGps.lng.toFixed(5)})` : "Exit: click boundary"}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground mb-2 leading-snug">
                Click near the polygon boundary — snaps to nearest edge.
              </div>
              <button onClick={resetEE}
                className="w-full text-xs py-1.5 border border-dashed border-border rounded hover:border-primary hover:text-primary text-muted-foreground transition-colors">
                Reset Entry / Exit
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Entry/Exit coordinate inputs — always shown after plan */}
        <AnimatePresence>
          {(finalResult || sweeping) && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-card border border-primary/30 rounded p-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Entry / Exit Coordinates</div>
              <div className="flex flex-col gap-1.5 text-xs mb-2">
                <div>
                  <label className="text-muted-foreground block mb-0.5 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Entry (lat, lng)
                  </label>
                  <input
                    type="text" value={entryInput} onChange={(e) => setEntryInput(e.target.value)}
                    placeholder="20.5937, 78.9629"
                    className="w-full bg-secondary border border-border rounded px-2 py-1 font-mono focus:border-green-500 outline-none text-foreground"
                  />
                  {entryGps && <div className="text-green-400 font-mono text-[10px] mt-0.5">✓ {entryGps.lat.toFixed(5)}, {entryGps.lng.toFixed(5)}</div>}
                </div>
                <div>
                  <label className="text-muted-foreground block mb-0.5 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Exit (lat, lng)
                  </label>
                  <input
                    type="text" value={exitInput} onChange={(e) => setExitInput(e.target.value)}
                    placeholder="20.5920, 78.9710"
                    className="w-full bg-secondary border border-border rounded px-2 py-1 font-mono focus:border-red-500 outline-none text-foreground"
                  />
                  {exitGps && <div className="text-red-400 font-mono text-[10px] mt-0.5">✓ {exitGps.lat.toFixed(5)}, {exitGps.lng.toFixed(5)}</div>}
                </div>
                {eeInputError && <div className="text-red-400 text-[11px]">{eeInputError}</div>}
                <button onClick={applyCoordEE}
                  disabled={!finalResult || sweeping}
                  className="w-full py-1.5 bg-primary/10 text-primary border border-primary/30 rounded text-xs font-semibold hover:bg-primary/20 disabled:opacity-40">
                  Apply Entry / Exit
                </button>
                <div className="text-[10px] text-muted-foreground">Or click the map after plan generates — snaps to boundary.</div>
                {(entryGps || exitGps) && (
                  <button onClick={resetEE}
                    className="w-full py-1 border border-dashed border-border rounded hover:border-primary hover:text-primary text-muted-foreground text-[11px]">
                    Reset Entry / Exit
                  </button>
                )}
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

          {/* Fill Edge Gaps */}
          <AnimatePresence>
            {finalResult && !sweeping && (
              <motion.button
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                onClick={handleFillGaps}
                disabled={gapFilled}
                className="w-full text-xs py-2 bg-secondary border border-dashed border-amber-500/40 text-amber-400 rounded font-semibold disabled:opacity-50 hover:border-amber-500 hover:bg-amber-500/10 transition-colors">
                {gapFilled
                  ? gapFillCount > 0 ? `✓ Gap-fill applied (+${gapFillCount} spots · ${finalResult.metrics.spotCount} total · ${finalResult.bestRotation}°)` : "✓ No gaps found"
                  : "Fill Edge Gaps ✦"}
              </motion.button>
            )}
          </AnimatePresence>

          {importError && (
            <div className="text-red-400 text-[11px] bg-red-950/30 border border-red-900 rounded px-2 py-1">
              {importError}
            </div>
          )}

          <button onClick={clearAll}
            className="w-full py-1.5 text-xs bg-secondary border border-border rounded hover:bg-muted text-muted-foreground">
            Clear All
          </button>
        </div>

        {/* Winner metrics */}
        <AnimatePresence>
          {finalResult && !sweeping && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-card border border-primary/40 rounded p-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">★ Optimal Result</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span className="text-muted-foreground">Hex Spots</span>    <span className="font-mono text-primary font-bold">{finalResult.metrics.spotCount}</span>
                <span className="text-muted-foreground">Grid Spots</span>   <span className="font-mono">{finalResult.metrics.squareGridCount}</span>
                <span className="text-muted-foreground">Improvement</span>  <span className="font-mono text-green-400">+{finalResult.metrics.improvementPercent.toFixed(1)}%</span>
                <span className="text-muted-foreground">Best Angle</span>   <span className="font-mono text-amber-400">{finalResult.bestRotation}°</span>
                <span className="text-muted-foreground">Lanes</span>        <span className="font-mono">{finalResult.lanes.length}</span>
                <span className="text-muted-foreground">Inset Area</span>   <span className="font-mono">{finalResult.metrics.insetArea.toFixed(0)} m²</span>
                <span className="text-muted-foreground">Total Area</span>   <span className="font-mono">{finalResult.metrics.totalArea.toFixed(0)} m²</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected spot info */}
        <AnimatePresence>
          {selectedSpot && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-card border border-border rounded p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {selectedSpot.zoneId === 1 ? "Gap-fill Spot" : `Spot #${selectedSpot.globalSequence + 1}`}
                </div>
                <button onClick={() => setSelectedSpot(null)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs font-mono">
                <span className="text-muted-foreground">Lane</span>      <span>{selectedSpot.laneId < 0 ? "gap" : selectedSpot.laneId}</span>
                <span className="text-muted-foreground">Seq/Lane</span>  <span>{selectedSpot.sequenceInLane}</span>
                <span className="text-muted-foreground">Global #</span>  <span>{selectedSpot.globalSequence + 1}</span>
                <span className="text-muted-foreground">Lat</span>       <span>{selectedSpot.lat.toFixed(6)}</span>
                <span className="text-muted-foreground">Lng</span>       <span>{selectedSpot.lng.toFixed(6)}</span>
                <span className="text-muted-foreground">X (m)</span>     <span>{selectedSpot.localX.toFixed(1)}</span>
                <span className="text-muted-foreground">Y (m)</span>     <span>{selectedSpot.localY.toFixed(1)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Right: Map + Sweep canvas ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">

        {/* Status bar */}
        <div className="text-xs shrink-0 h-4 font-mono">{statusBar}</div>

        {/* Leaflet map — full height when done, partial during sweep */}
        <div className={`rounded overflow-hidden border border-border transition-all ${sweeping || liveResult && !finalResult ? "flex-[0_0_48%]" : "flex-1"}`}>
          {leafletReady
            ? <LeafletMap
                polygonPts={mapDisplayPts}
                onMapClick={handleMapClick}
                layer={layer}
                fitTo={fitTo}
                spotMarkers={spotMarkersGps}
                insetPolyGps={insetPolyGps}
                entryGps={entryGps}
                exitGps={exitGps}
                onSpotClick={setSelectedSpot}
              />
            : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading map…</div>
          }
        </div>

        {/* Live sweep canvas — visible during sweep, hides when spots land on map */}
        <AnimatePresence>
          {(sweeping || (liveResult && !finalResult)) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col gap-2 min-h-0">

              <div className="text-[10px] font-mono text-muted-foreground uppercase">
                Sweep Canvas — live spot animation at each angle (0–59°)
                {bestSoFar !== null && <span className="text-amber-400 ml-2">best so far: {bestSoFar}° ({sweepResults.find((r) => r.bestRotation === bestSoFar)?.metrics.spotCount ?? "—"} spots)</span>}
              </div>

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
