import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  runLocalEngine, runAtAngle, DEFAULT_TRUCKS,
  type Pt, type TruckConfig, type LocalPackResult, type RotScore,
} from "@/engine/localEngine";
import { useGetPresets } from "@workspace/api-client-react";
import PackingCanvas from "./PackingCanvas";
import { usePlanContext } from "@/lib/planContext";
import type { SpotLocal } from "@/engine/localEngine";

const PRESETS_POLY: { id: string; name: string; polygon: Pt[] }[] = [
  { id: "rect",  name: "Rectangle 200×150m",  polygon: [{x:0,y:0},{x:200,y:0},{x:200,y:150},{x:0,y:150}] },
  { id: "l",     name: "L-Shape Terrace",      polygon: [{x:0,y:0},{x:180,y:0},{x:180,y:80},{x:100,y:80},{x:100,y:160},{x:0,y:160}] },
  { id: "trap",  name: "Trapezoidal Bench",    polygon: [{x:30,y:0},{x:220,y:0},{x:250,y:120},{x:0,y:120}] },
  { id: "pent",  name: "Pentagonal Zone",      polygon: [{x:100,y:0},{x:220,y:60},{x:190,y:180},{x:50,y:190},{x:0,y:80}] },
  { id: "strip", name: "Narrow Strip 300×60m", polygon: [{x:0,y:0},{x:300,y:0},{x:310,y:60},{x:10,y:60}] },
];

const SWEEP_MS = 180;
const BLANK_CUSTOM: Omit<TruckConfig, "id"> = {
  name: "", width: 9, length: 14, turningRadius: 12, spacingX: 13.5, spacingY: 13.5, payloadTonnes: 200,
};

export default function PlannerTab() {
  const { setCurrentPlan, setCurrentPolygon, customTrucks, addCustomTruck, removeCustomTruck } = usePlanContext();
  const { data: presets } = useGetPresets(undefined, { query: { queryKey: ["getPresets"] as const } });

  const [polygon, setPolygon]           = useState<Pt[]>([]);
  const [closed, setClosed]             = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState("cat-793");
  const [rotStep, setRotStep]           = useState(5);
  const [displayResult, setDisplayResult] = useState<LocalPackResult | null>(null);
  const [finalResult, setFinalResult]   = useState<LocalPackResult | null>(null);
  const [sweeping, setSweeping]         = useState(false);
  const [sweepAngle, setSweepAngle]     = useState<number | null>(null);
  const [sweepScores, setSweepScores]   = useState<RotScore[]>([]);
  const [bestSoFar, setBestSoFar]       = useState<number | null>(null);
  const [tooltip, setTooltip]           = useState<{ spot: SpotLocal } | null>(null);

  // Custom truck form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm]         = useState({ ...BLANK_CUSTOM });
  const [customError, setCustomError]       = useState("");

  const sweepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // All trucks = defaults (from API or fallback) + user-defined custom
  const apiTrucks = (presets?.truckProfiles as TruckConfig[] | undefined)
    ?.filter((t) => t.id !== "komatsu-930e") ?? DEFAULT_TRUCKS;
  const allTrucks: TruckConfig[] = [...apiTrucks, ...customTrucks];
  const selectedTruck = allTrucks.find((t) => t.id === selectedTruckId) ?? allTrucks[0];

  const stopSweep = useCallback(() => {
    if (sweepRef.current) { clearInterval(sweepRef.current); sweepRef.current = null; }
    setSweeping(false); setSweepAngle(null);
  }, []);

  const runSweep = useCallback((poly: Pt[], truck: TruckConfig, step: number) => {
    if (poly.length < 3) return;
    stopSweep();
    const angles: number[] = [];
    for (let a = 0; a < 60; a += step) angles.push(a);
    setSweeping(true); setSweepScores([]); setBestSoFar(null);

    let idx = 0, localScores: RotScore[] = [], localBestCount = 0, localBestAngle = 0;

    sweepRef.current = setInterval(() => {
      if (idx >= angles.length) {
        clearInterval(sweepRef.current!); sweepRef.current = null;
        const final = runLocalEngine(poly, truck, step);
        setSweeping(false); setSweepAngle(null);
        setDisplayResult(final); setFinalResult(final);
        setCurrentPlan(final);
        return;
      }
      const a = angles[idx];
      const interim = runAtAngle(poly, truck, a);
      localScores = [...localScores, { angle: a, spotCount: interim.spots.length }];
      setSweepScores([...localScores]);
      setSweepAngle(a);
      setDisplayResult(interim);
      if (interim.spots.length > localBestCount) {
        localBestCount = interim.spots.length; localBestAngle = a; setBestSoFar(localBestAngle);
      }
      idx++;
    }, SWEEP_MS);
  }, [stopSweep, setCurrentPlan]);

  useEffect(() => () => stopSweep(), [stopSweep]);

  // ── Drawing: identity transform is used so every click maps exactly 1:1 to canvas px ──
  const addVertex = useCallback((localX: number, localY: number) => {
    if (closed || sweeping) return;
    setPolygon((prev) => {
      const next = [...prev, { x: localX, y: localY }];
      setCurrentPolygon({ pts: next, closed: false });
      if (next.length >= 3) {
        // live preview at angle 0 (no sweep while drawing)
        setDisplayResult(runAtAngle(next, selectedTruck, 0));
      }
      return next;
    });
  }, [closed, sweeping, selectedTruck, setCurrentPolygon]);

  const closePoly = useCallback(() => {
    if (polygon.length < 3 || closed) return;
    setClosed(true);
    setCurrentPolygon({ pts: polygon, closed: true });
    runSweep(polygon, selectedTruck, rotStep);
  }, [polygon, closed, selectedTruck, rotStep, runSweep, setCurrentPolygon]);

  const clearPoly = useCallback(() => {
    stopSweep();
    setPolygon([]); setClosed(false);
    setDisplayResult(null); setFinalResult(null);
    setSweepScores([]); setBestSoFar(null);
    setCurrentPlan(null); setCurrentPolygon(null);
    setTooltip(null);
  }, [stopSweep, setCurrentPlan, setCurrentPolygon]);

  const loadPreset = useCallback((poly: Pt[]) => {
    stopSweep();
    setPolygon(poly); setClosed(true); setFinalResult(null); setTooltip(null);
    setCurrentPolygon({ pts: poly, closed: true });
    runSweep(poly, selectedTruck, rotStep);
  }, [selectedTruck, rotStep, stopSweep, runSweep, setCurrentPolygon]);

  const applyTruck = useCallback((id: string) => {
    setSelectedTruckId(id);
    const truck = allTrucks.find((t) => t.id === id) ?? allTrucks[0];
    if (polygon.length >= 3) runSweep(polygon, truck, rotStep);
  }, [polygon, rotStep, allTrucks, runSweep]);

  const handleGenerate = useCallback(() => {
    if (polygon.length < 3) return;
    if (!closed) { closePoly(); return; }
    runSweep(polygon, selectedTruck, rotStep);
  }, [polygon, closed, selectedTruck, rotStep, closePoly, runSweep]);

  // ── Custom truck submission ──
  const handleAddCustomTruck = useCallback(() => {
    if (!customForm.name.trim()) { setCustomError("Name is required"); return; }
    if (customForm.width <= 0 || customForm.length <= 0 || customForm.turningRadius <= 0) {
      setCustomError("Width, Length and Turning Radius must be > 0"); return;
    }
    const id = `custom-${customForm.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    addCustomTruck({ id, ...customForm });
    setSelectedTruckId(id);
    setCustomError(""); setShowCustomForm(false); setCustomForm({ ...BLANK_CUSTOM });
    if (polygon.length >= 3) runSweep(polygon, { id, ...customForm }, rotStep);
  }, [customForm, addCustomTruck, polygon, rotStep, runSweep]);

  const result   = displayResult;
  const scores   = sweeping ? sweepScores : (finalResult?.rotationScores ?? []);
  const maxScore = Math.max(...scores.map((s) => s.spotCount), 1);

  return (
    <div className="flex h-full gap-4 p-4 overflow-hidden">

      {/* ── Left panel ── */}
      <div className="flex flex-col gap-3 w-72 shrink-0 overflow-y-auto">

        {/* Polygon editor */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Polygon Editor</div>
          <div className="flex gap-2 mb-2">
            <button onClick={clearPoly}
              className="text-xs px-3 py-1.5 bg-secondary border border-border rounded hover:bg-muted"
              data-testid="button-clear-polygon">Clear</button>
            <button onClick={closePoly}
              disabled={polygon.length < 3 || closed || sweeping}
              className="flex-1 text-xs px-2 py-1.5 bg-primary text-primary-foreground rounded disabled:opacity-40 font-semibold"
              data-testid="button-close-polygon">Close & Optimize</button>
          </div>
          <div className="text-xs text-muted-foreground mb-2 min-h-[1.2em]">
            {sweeping
              ? <span className="text-amber-400 font-mono">Scanning {sweepAngle}° — best so far: {bestSoFar !== null ? `${bestSoFar}°` : "—"}</span>
              : closed ? `Closed — ${polygon.length} vertices`
              : polygon.length === 0 ? "Click canvas to add vertices (min 3)"
              : `${polygon.length} vertices — keep clicking, then Close & Optimize`}
          </div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 mt-2">Presets</div>
          <div className="flex flex-col gap-1">
            {PRESETS_POLY.map((p) => (
              <button key={p.id} onClick={() => loadPreset(p.polygon)}
                className="text-left text-xs px-2 py-1.5 bg-secondary hover:bg-muted border border-border rounded truncate"
                data-testid={`preset-${p.id}`}>{p.name}</button>
            ))}
          </div>
        </div>

        {/* Truck model */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Truck Model</div>
          <div className="flex flex-col gap-1 mb-2">
            {allTrucks.map((t) => (
              <div key={t.id} className="flex items-center gap-1">
                <button onClick={() => applyTruck(t.id)}
                  className={`flex-1 text-left text-xs px-2 py-1.5 rounded border transition-colors ${
                    selectedTruck.id === t.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:bg-muted"
                  }`}
                  data-testid={`truck-${t.id}`}>{t.name}</button>
                {t.id.startsWith("custom-") && (
                  <button onClick={() => removeCustomTruck(t.id)}
                    className="text-xs text-muted-foreground hover:text-red-400 px-1"
                    title="Remove">✕</button>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs mb-2">
            <span className="text-muted-foreground">Width</span>        <span className="font-mono">{selectedTruck.width}m</span>
            <span className="text-muted-foreground">Length</span>       <span className="font-mono">{selectedTruck.length}m</span>
            <span className="text-muted-foreground">Turn Radius</span>  <span className="font-mono text-primary">{selectedTruck.turningRadius}m</span>
            <span className="text-muted-foreground">Spacing X/Y</span>  <span className="font-mono">{selectedTruck.spacingX}m</span>
            <span className="text-muted-foreground">Payload</span>      <span className="font-mono">{selectedTruck.payloadTonnes}t</span>
          </div>
          <button onClick={() => { setShowCustomForm((v) => !v); setCustomError(""); }}
            className="w-full text-xs py-1.5 border border-dashed border-border rounded hover:border-primary hover:text-primary text-muted-foreground transition-colors">
            {showCustomForm ? "Cancel Custom Truck" : "+ Add Custom Truck"}
          </button>
        </div>

        {/* Custom truck form */}
        <AnimatePresence>
          {showCustomForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-card border border-primary/30 rounded p-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Custom Truck Config</div>
              <div className="flex flex-col gap-1.5 text-xs">
                {([
                  ["name", "Truck Name", "text"],
                  ["width", "Body Width (m)", "number"],
                  ["length", "Body Length (m)", "number"],
                  ["turningRadius", "Turning Radius (m)", "number"],
                  ["spacingX", "Spacing X (m)", "number"],
                  ["spacingY", "Spacing Y (m)", "number"],
                  ["payloadTonnes", "Payload (tonnes)", "number"],
                ] as [keyof typeof customForm, string, string][]).map(([field, label, type]) => (
                  <div key={field}>
                    <label className="text-muted-foreground block mb-0.5">{label}</label>
                    <input type={type} value={(customForm as any)[field]}
                      onChange={(e) => setCustomForm((prev) => ({
                        ...prev,
                        [field]: type === "number" ? Number(e.target.value) : e.target.value,
                      }))}
                      className="w-full bg-secondary border border-border rounded px-2 py-1 font-mono text-foreground focus:border-primary outline-none"
                      placeholder={type === "number" ? "0" : "My Truck"} />
                  </div>
                ))}
                {customError && <div className="text-red-400 text-[11px]">{customError}</div>}
                <button onClick={handleAddCustomTruck}
                  className="w-full py-1.5 bg-primary text-primary-foreground rounded font-semibold hover:opacity-90 mt-1">
                  Add & Select Truck
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Optimization controls */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Optimization</div>
          <label className="text-xs text-muted-foreground block mb-1">
            Rotation Step: <span className="font-mono text-foreground">{rotStep}°</span>
            <span className="text-muted-foreground ml-1">(finer = slower but more precise)</span>
          </label>
          <input type="range" min={1} max={15} value={rotStep}
            onChange={(e) => setRotStep(Number(e.target.value))}
            className="w-full accent-primary mb-3"
            data-testid="slider-rotation-step" />
          <button onClick={handleGenerate}
            disabled={polygon.length < 3 || sweeping}
            className="w-full text-sm py-2 bg-primary text-primary-foreground rounded font-semibold disabled:opacity-40 hover:opacity-90"
            data-testid="button-generate-plan">
            {sweeping ? "Optimizing…" : closed ? "Re-run Optimization" : "Close & Optimize"}
          </button>
        </div>

        {/* Results with explanations */}
        <AnimatePresence>
          {finalResult && !sweeping && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-card border border-primary/30 rounded p-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">★ Optimal Result</div>
              <div className="flex flex-col gap-1 text-xs">
                <ResultRow label="Hex Spots" value={String(finalResult.metrics.spotCount)} accent
                  tip="Total dump spots hex-packing fits inside the turning-radius buffer" />
                <ResultRow label="Grid Spots" value={String(finalResult.metrics.squareGridCount)}
                  tip="How many spots a basic square grid would fit (baseline)" />
                <ResultRow label="Improvement" value={`+${finalResult.metrics.improvementPercent.toFixed(1)}%`}
                  tip="(Hex − Grid) / Grid × 100: how much better hex is vs square grid"
                  positive />
                <ResultRow label="Best Angle" value={`${finalResult.bestRotation}°`}
                  tip="Rotation that gave the most spots out of the 0–60° sweep" />
                <ResultRow label="Lanes" value={String(finalResult.lanes.length)}
                  tip="Approach lanes (columns) the spots are grouped into for truck routing" />
                <ResultRow label="Inset Area" value={`${finalResult.metrics.insetArea.toFixed(0)} m²`}
                  tip="Usable area after shrinking the polygon by the turning radius on every side" />
                <ResultRow label="Total Area" value={`${finalResult.metrics.totalArea.toFixed(0)} m²`}
                  tip="Full polygon area (before inset)" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground h-5">
          <span>
            {sweeping
              ? `Scanning ${sweepAngle}° — ${result?.spots.length ?? 0} spots | best so far: ${bestSoFar !== null ? `${bestSoFar}°` : "—"}`
              : finalResult
              ? `${finalResult.spots.length} spots · ${finalResult.lanes.length} lanes · optimal ${finalResult.bestRotation}°`
              : "Draw polygon vertices on the canvas — click each corner"}
          </span>
          <div className="flex gap-3 items-center">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-amber-500" />Inset buffer</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-slate-400" />Boundary</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-primary/60" />Spot</span>
          </div>
        </div>

        <div className="relative flex-1 bg-[#0b0e15] border border-border rounded overflow-hidden">
          <PackingCanvas
            polygon={polygon}
            insetPolygon={result?.insetPolygon ?? []}
            spots={result?.spots ?? []}
            lanes={result?.lanes ?? []}
            isClosed={closed}
            onCanvasClick={addVertex}
            onSpotClick={(s) => setTooltip({ spot: s })}
            sweepAngle={sweeping ? sweepAngle : null}
          />

          <AnimatePresence>
            {tooltip && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute top-4 right-4 bg-card border border-border rounded p-3 text-xs font-mono z-10 shadow-lg min-w-[180px]"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-primary font-bold">Spot #{tooltip.spot.id + 1}</span>
                  <button onClick={() => setTooltip(null)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <span className="text-muted-foreground">Lane</span>       <span>{tooltip.spot.laneId}</span>
                  <span className="text-muted-foreground">Seq/Lane</span>   <span>{tooltip.spot.sequenceInLane}</span>
                  <span className="text-muted-foreground">Global #</span>   <span>{tooltip.spot.globalSequence + 1}</span>
                  <span className="text-muted-foreground">Rotation</span>   <span>{tooltip.spot.rotation}°</span>
                  <span className="text-muted-foreground">X (m)</span>      <span>{tooltip.spot.x.toFixed(1)}</span>
                  <span className="text-muted-foreground">Y (m)</span>      <span>{tooltip.spot.y.toFixed(1)}</span>
                  <span className="text-muted-foreground">Safe</span>
                  <span className={tooltip.spot.safe ? "text-green-400" : "text-red-400"}>{tooltip.spot.safe ? "Yes" : "No"}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rotation score bar chart */}
        {scores.length > 0 && (
          <div className="h-16 bg-card border border-border rounded px-3 py-2 flex items-end gap-0.5 overflow-hidden shrink-0">
            <div className="text-[10px] text-muted-foreground font-mono mr-2 shrink-0 self-center">ROTATION SWEEP</div>
            {scores.map((s) => {
              const h = Math.max(2, Math.round((s.spotCount / maxScore) * 36));
              const isBest    = !sweeping && s.angle === finalResult?.bestRotation;
              const isCurrent = sweeping && s.angle === sweepAngle;
              const isSoFar   = sweeping && s.angle === bestSoFar;
              return (
                <div key={s.angle} className="flex flex-col items-center gap-0.5 flex-1 min-w-0" title={`${s.angle}°: ${s.spotCount} spots`}>
                  <motion.div initial={{ height: 0 }} animate={{ height: h }}
                    className={`w-full rounded-t ${isBest ? "bg-primary" : isCurrent ? "bg-white" : isSoFar ? "bg-amber-400" : "bg-slate-600"}`} />
                  <span className="text-[8px] text-muted-foreground font-mono">{s.angle}°</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultRow({ label, value, tip, accent = false, positive = false }: {
  label: string; value: string; tip: string; accent?: boolean; positive?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <div className="flex justify-between items-center">
        <button
          className="text-muted-foreground underline decoration-dotted underline-offset-2 cursor-help"
          onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
          {label}
        </button>
        <span className={`font-mono font-bold ${accent ? "text-primary" : positive ? "text-green-400" : "text-foreground"}`}>
          {value}
        </span>
      </div>
      {show && (
        <div className="absolute z-20 left-0 bottom-full mb-1 bg-[#0f1117] border border-border rounded px-2 py-1.5 text-[11px] text-muted-foreground w-56 leading-snug shadow-lg">
          {tip}
        </div>
      )}
    </div>
  );
}
