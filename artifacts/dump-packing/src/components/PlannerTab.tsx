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

const PRESETS_POLY = [
  { id: "rect",   name: "Rectangle 200×150m",  polygon: [{ x:0,y:0},{x:200,y:0},{x:200,y:150},{x:0,y:150}] },
  { id: "l",      name: "L-Shape Terrace",      polygon: [{ x:0,y:0},{x:180,y:0},{x:180,y:80},{x:100,y:80},{x:100,y:160},{x:0,y:160}] },
  { id: "trap",   name: "Trapezoidal Bench",    polygon: [{ x:30,y:0},{x:220,y:0},{x:250,y:120},{x:0,y:120}] },
  { id: "pent",   name: "Pentagonal Zone",      polygon: [{ x:100,y:0},{x:220,y:60},{x:190,y:180},{x:50,y:190},{x:0,y:80}] },
  { id: "strip",  name: "Narrow Strip 300×60m", polygon: [{ x:0,y:0},{x:300,y:0},{x:310,y:60},{x:10,y:60}] },
];

interface SpotTooltip { spot: SpotLocal }

const SWEEP_INTERVAL_MS = 220;

export default function PlannerTab() {
  const { setCurrentPlan } = usePlanContext();

  const [polygon, setPolygon] = useState<Pt[]>([]);
  const [closed, setClosed]   = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<TruckConfig>(DEFAULT_TRUCKS[0]);
  const [rotStep, setRotStep] = useState(5);

  // What's shown on canvas right now
  const [displayResult, setDisplayResult] = useState<LocalPackResult | null>(null);
  // Final winner (null during sweep)
  const [finalResult, setFinalResult]     = useState<LocalPackResult | null>(null);

  // Rotation sweep state
  const [sweeping, setSweeping]         = useState(false);
  const [sweepAngle, setSweepAngle]     = useState<number | null>(null);
  const [sweepScores, setSweepScores]   = useState<RotScore[]>([]);
  const [bestSoFar, setBestSoFar]       = useState<number | null>(null);
  const sweepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [tooltip, setTooltip] = useState<SpotTooltip | null>(null);

  const { data: presets } = useGetPresets(undefined, { query: { queryKey: ["getPresets"] as const } });
  const trucks: TruckConfig[] = (presets?.truckProfiles as TruckConfig[] | undefined)
    ?.filter((t) => t.id !== "komatsu-930e") ?? DEFAULT_TRUCKS;

  // Stop any running sweep
  const stopSweep = useCallback(() => {
    if (sweepRef.current) { clearInterval(sweepRef.current); sweepRef.current = null; }
    setSweeping(false);
    setSweepAngle(null);
  }, []);

  // Run animated rotation sweep
  const runSweep = useCallback((poly: Pt[], truck: TruckConfig, step: number) => {
    if (poly.length < 3) return;
    stopSweep();

    const angles: number[] = [];
    for (let a = 0; a < 60; a += step) angles.push(a);

    setSweeping(true);
    setSweepScores([]);
    setBestSoFar(null);

    let idx = 0;
    let localScores: RotScore[] = [];
    let localBestCount = 0;
    let localBestAngle = 0;

    sweepRef.current = setInterval(() => {
      if (idx >= angles.length) {
        // Sweep done — show winner
        clearInterval(sweepRef.current!);
        sweepRef.current = null;
        const final = runLocalEngine(poly, truck, step);
        setSweeping(false);
        setSweepAngle(null);
        setDisplayResult(final);
        setFinalResult(final);
        setCurrentPlan(final);
        return;
      }

      const a = angles[idx];
      const interim = runAtAngle(poly, truck, a);
      const count = interim.spots.length;
      localScores = [...localScores, { angle: a, spotCount: count }];
      setSweepScores([...localScores]);
      setSweepAngle(a);
      setDisplayResult(interim);

      if (count > localBestCount) {
        localBestCount = count;
        localBestAngle = a;
        setBestSoFar(localBestAngle);
      }

      idx++;
    }, SWEEP_INTERVAL_MS);
  }, [stopSweep, setCurrentPlan]);

  useEffect(() => () => stopSweep(), [stopSweep]);

  const addVertex = useCallback((localX: number, localY: number) => {
    if (closed || sweeping) return;
    setPolygon((prev) => {
      const newPoly = [...prev, { x: localX, y: localY }];
      if (newPoly.length >= 3) {
        // Instant preview at current best rotation (no sweep while drawing)
        const r = runAtAngle(newPoly, selectedTruck, finalResult?.bestRotation ?? 0);
        setDisplayResult(r);
      }
      return newPoly;
    });
  }, [closed, sweeping, selectedTruck, finalResult]);

  const closePoly = useCallback(() => {
    if (polygon.length < 3) return;
    setClosed(true);
    runSweep(polygon, selectedTruck, rotStep);
  }, [polygon, selectedTruck, rotStep, runSweep]);

  const clearPoly = useCallback(() => {
    stopSweep();
    setPolygon([]); setClosed(false);
    setDisplayResult(null); setFinalResult(null);
    setSweepScores([]); setBestSoFar(null);
    setCurrentPlan(null);
    setTooltip(null);
  }, [stopSweep, setCurrentPlan]);

  const loadPreset = useCallback((poly: Pt[]) => {
    stopSweep();
    setPolygon(poly); setClosed(true);
    setFinalResult(null); setTooltip(null);
    runSweep(poly, selectedTruck, rotStep);
  }, [selectedTruck, rotStep, stopSweep, runSweep]);

  const applyTruck = useCallback((truck: TruckConfig) => {
    setSelectedTruck(truck);
    if (polygon.length >= 3) runSweep(polygon, truck, rotStep);
  }, [polygon, rotStep, runSweep]);

  const handleGenerate = useCallback(() => {
    if (polygon.length < 3) return;
    const poly = polygon;
    runSweep(poly, selectedTruck, rotStep);
  }, [polygon, selectedTruck, rotStep, runSweep]);

  const result = displayResult;
  const scores = sweeping ? sweepScores : (finalResult?.rotationScores ?? []);
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
              className="text-xs px-2 py-1 bg-secondary border border-border rounded hover:bg-muted"
              data-testid="button-clear-polygon">Clear</button>
            <button onClick={closePoly}
              disabled={polygon.length < 3 || closed || sweeping}
              className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded disabled:opacity-40"
              data-testid="button-close-polygon">Close & Optimize</button>
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {sweeping
              ? <span className="text-amber-400 font-mono">Scanning rotations… {sweepAngle}°</span>
              : closed
              ? `Closed — ${polygon.length} vertices`
              : `${polygon.length} vertices — click canvas to add (min 3)`}
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
          <div className="flex flex-col gap-1 mb-3">
            {trucks.map((t) => (
              <button key={t.id} onClick={() => applyTruck(t)}
                className={`text-left text-xs px-2 py-1.5 rounded border transition-colors ${
                  selectedTruck.id === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary hover:bg-muted"
                }`}
                data-testid={`truck-${t.id}`}>{t.name}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
            <span className="text-muted-foreground">Width</span>        <span className="font-mono">{selectedTruck.width}m</span>
            <span className="text-muted-foreground">Length</span>       <span className="font-mono">{selectedTruck.length}m</span>
            <span className="text-muted-foreground">Turn Radius</span>  <span className="font-mono text-primary">{selectedTruck.turningRadius}m</span>
            <span className="text-muted-foreground">Spacing X/Y</span>  <span className="font-mono">{selectedTruck.spacingX}m</span>
            <span className="text-muted-foreground">Payload</span>      <span className="font-mono">{selectedTruck.payloadTonnes}t</span>
          </div>
        </div>

        {/* Optimization controls */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Optimization</div>
          <label className="text-xs text-muted-foreground block mb-1">
            Rotation Step: <span className="font-mono text-foreground">{rotStep}°</span>
          </label>
          <input type="range" min={1} max={15} value={rotStep}
            onChange={(e) => { const v = Number(e.target.value); setRotStep(v); }}
            className="w-full accent-primary mb-3"
            data-testid="slider-rotation-step" />
          <button onClick={handleGenerate}
            disabled={polygon.length < 3 || sweeping}
            className="w-full text-sm py-2 bg-primary text-primary-foreground rounded font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
            data-testid="button-generate-plan">
            {sweeping ? "Optimizing…" : "Run Optimization"}
          </button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {finalResult && !sweeping && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-card border border-primary/30 rounded p-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                ★ Optimal Result
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                <span className="text-muted-foreground">Hex Spots</span>
                <span className="font-mono text-primary font-bold">{finalResult.metrics.spotCount}</span>
                <span className="text-muted-foreground">Grid Spots</span>
                <span className="font-mono">{finalResult.metrics.squareGridCount}</span>
                <span className="text-muted-foreground">Improvement</span>
                <span className={`font-mono font-bold ${finalResult.metrics.improvementPercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                  +{finalResult.metrics.improvementPercent.toFixed(1)}%
                </span>
                <span className="text-muted-foreground">Best Angle</span>
                <span className="font-mono text-amber-400">{finalResult.bestRotation}°</span>
                <span className="text-muted-foreground">Lanes</span>
                <span className="font-mono">{finalResult.lanes.length}</span>
                <span className="text-muted-foreground">Inset Area</span>
                <span className="font-mono">{finalResult.metrics.insetArea.toFixed(0)} m²</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        {/* Status bar */}
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground h-5">
          <span>
            {sweeping
              ? `Testing ${sweepAngle}° — ${result?.spots.length ?? 0} spots (best so far: ${bestSoFar !== null ? `${bestSoFar}°` : "—"})`
              : finalResult
              ? `${finalResult.spots.length} spots · ${finalResult.lanes.length} lanes · optimal ${finalResult.bestRotation}°`
              : "Draw or load a polygon to begin"}
          </span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-amber-500" />Inset
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 bg-slate-400" />Polygon
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary/60" />Spot
            </span>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative flex-1 bg-[#0b0e15] border border-border rounded overflow-hidden">
          <PackingCanvas
            polygon={polygon}
            insetPolygon={result?.insetPolygon ?? []}
            spots={result?.spots ?? []}
            lanes={result?.lanes ?? []}
            onCanvasClick={addVertex}
            onSpotClick={(spot) => setTooltip({ spot })}
            sweepAngle={sweeping ? sweepAngle : null}
          />

          {/* Spot tooltip */}
          <AnimatePresence>
            {tooltip && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute top-4 right-4 bg-card border border-border rounded p-3 text-xs font-mono z-10 shadow-lg min-w-[160px]"
                data-testid="spot-tooltip"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-primary font-bold">Spot #{tooltip.spot.id + 1}</span>
                  <button onClick={() => setTooltip(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <span className="text-muted-foreground">Lane</span><span>{tooltip.spot.laneId}</span>
                  <span className="text-muted-foreground">Seq/Lane</span><span>{tooltip.spot.sequenceInLane}</span>
                  <span className="text-muted-foreground">Global #</span><span>{tooltip.spot.globalSequence + 1}</span>
                  <span className="text-muted-foreground">Rotation</span><span>{tooltip.spot.rotation}°</span>
                  <span className="text-muted-foreground">X</span><span>{tooltip.spot.x.toFixed(1)}m</span>
                  <span className="text-muted-foreground">Y</span><span>{tooltip.spot.y.toFixed(1)}m</span>
                  <span className="text-muted-foreground">Safe</span>
                  <span className={tooltip.spot.safe ? "text-green-400" : "text-red-400"}>
                    {tooltip.spot.safe ? "Yes" : "No"}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rotation score bar chart */}
        {scores.length > 0 && (
          <div className="h-16 bg-card border border-border rounded px-3 py-2 flex items-end gap-0.5 overflow-hidden shrink-0">
            <div className="text-[10px] text-muted-foreground mr-2 shrink-0 self-center font-mono">ROTATION SWEEP</div>
            {scores.map((s) => {
              const h = Math.max(2, Math.round((s.spotCount / maxScore) * 36));
              const isBest = !sweeping && s.angle === finalResult?.bestRotation;
              const isCurrent = sweeping && s.angle === sweepAngle;
              const isBestSoFar = sweeping && s.angle === bestSoFar;
              return (
                <div key={s.angle} className="flex flex-col items-center gap-0.5 flex-1 min-w-0" title={`${s.angle}°: ${s.spotCount} spots`}>
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: h }}
                    className={`w-full rounded-t ${
                      isBest ? "bg-primary" :
                      isCurrent ? "bg-white" :
                      isBestSoFar ? "bg-amber-400" :
                      "bg-secondary"
                    }`}
                  />
                  <span className="text-[8px] text-muted-foreground font-mono leading-none">{s.angle}°</span>
                </div>
              );
            })}
            {sweeping && (
              <div className="ml-2 self-center text-[10px] font-mono text-amber-400 shrink-0">
                scanning…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
