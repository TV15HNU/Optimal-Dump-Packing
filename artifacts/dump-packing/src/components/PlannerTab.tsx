import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { runLocalEngine, DEFAULT_TRUCKS, type Pt, type TruckConfig, type LocalPackResult } from "@/engine/localEngine";
import { useGetPresets, useGeneratePack } from "@workspace/api-client-react";
import PackingCanvas from "./PackingCanvas";
import type { SpotLocal } from "@/engine/localEngine";

const PRESETS_POLY = [
  { id: "rect", name: "Rectangle 200×150m", polygon: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 150 }, { x: 0, y: 150 }] },
  { id: "l-shape", name: "L-Shape Terrace", polygon: [{ x: 0, y: 0 }, { x: 180, y: 0 }, { x: 180, y: 80 }, { x: 100, y: 80 }, { x: 100, y: 160 }, { x: 0, y: 160 }] },
  { id: "trap", name: "Trapezoidal Bench", polygon: [{ x: 30, y: 0 }, { x: 220, y: 0 }, { x: 250, y: 120 }, { x: 0, y: 120 }] },
  { id: "pent", name: "Pentagonal Zone", polygon: [{ x: 100, y: 0 }, { x: 220, y: 60 }, { x: 190, y: 180 }, { x: 50, y: 190 }, { x: 0, y: 80 }] },
  { id: "strip", name: "Narrow Strip 300×60m", polygon: [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 310, y: 60 }, { x: 10, y: 60 }] },
];

interface SpotTooltip { spot: SpotLocal; screenX: number; screenY: number; }

export default function PlannerTab() {
  const [polygon, setPolygon] = useState<Pt[]>([]);
  const [closed, setClosed] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<TruckConfig>(DEFAULT_TRUCKS[0]);
  const [rotStep, setRotStep] = useState(5);
  const [result, setResult] = useState<LocalPackResult | null>(null);
  const [tooltip, setTooltip] = useState<SpotTooltip | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const { data: presets } = useGetPresets(undefined, { query: { queryKey: ["getPresets"] as const } });
  const generateMutation = useGeneratePack();

  const addVertex = useCallback((localX: number, localY: number) => {
    if (closed) return;
    setPolygon((prev) => {
      const newPoly = [...prev, { x: localX, y: localY }];
      if (newPoly.length >= 3) {
        const r = runLocalEngine(newPoly, selectedTruck, rotStep);
        setResult(r);
      }
      return newPoly;
    });
  }, [closed, selectedTruck, rotStep]);

  const closePoly = useCallback(() => {
    if (polygon.length >= 3) {
      setClosed(true);
      const r = runLocalEngine(polygon, selectedTruck, rotStep);
      setResult(r);
    }
  }, [polygon, selectedTruck, rotStep]);

  const clearPoly = useCallback(() => {
    setPolygon([]); setClosed(false); setResult(null); setTooltip(null);
  }, []);

  const loadPreset = useCallback((poly: Pt[]) => {
    setPolygon(poly); setClosed(true);
    const r = runLocalEngine(poly, selectedTruck, rotStep);
    setResult(r);
    setTooltip(null);
  }, [selectedTruck, rotStep]);

  const applyTruck = useCallback((truck: TruckConfig) => {
    setSelectedTruck(truck);
    if (polygon.length >= 3) {
      const r = runLocalEngine(polygon, truck, rotStep);
      setResult(r);
    }
  }, [polygon, rotStep]);

  const generatePlan = useCallback(async () => {
    if (polygon.length < 3) return;
    try {
      const plan = await generateMutation.mutateAsync({
        data: {
          polygon,
          truckProfileId: selectedTruck.id,
          rotationStep: rotStep,
        }
      });
      // Map API response to local format
      setResult({
        spots: plan.spots as any,
        lanes: plan.lanes as any,
        polygon: plan.polygon,
        insetPolygon: plan.insetPolygon,
        bestRotation: plan.bestRotation,
        rotationScores: plan.rotationScores ?? [],
        metrics: plan.metrics,
      });
    } catch {
      // Fall back to local engine already shown
    }
  }, [polygon, selectedTruck, rotStep, generateMutation]);

  const trucks = (presets?.truckProfiles as TruckConfig[] | undefined) ?? DEFAULT_TRUCKS;

  return (
    <div className="flex h-full gap-4 p-4 overflow-hidden">
      {/* Left Panel */}
      <div className="flex flex-col gap-3 w-72 shrink-0 overflow-y-auto">
        {/* Polygon Editor */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Polygon Editor</div>
          <div className="flex gap-2 mb-2 flex-wrap">
            <button
              onClick={clearPoly}
              className="text-xs px-2 py-1 bg-secondary text-foreground rounded hover:bg-muted border border-border"
              data-testid="button-clear-polygon"
            >Clear</button>
            <button
              onClick={closePoly}
              disabled={polygon.length < 3 || closed}
              className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded disabled:opacity-40"
              data-testid="button-close-polygon"
            >Close</button>
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {closed ? `Polygon closed — ${polygon.length} vertices` : `${polygon.length} vertices (click canvas to add, min 3)`}
          </div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 mt-2">Presets</div>
          <div className="flex flex-col gap-1">
            {PRESETS_POLY.map((p) => (
              <button
                key={p.id}
                onClick={() => loadPreset(p.polygon)}
                className="text-left text-xs px-2 py-1.5 bg-secondary hover:bg-muted border border-border rounded truncate"
                data-testid={`preset-${p.id}`}
              >{p.name}</button>
            ))}
          </div>
        </div>

        {/* Truck Config */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Truck Model</div>
          <div className="flex flex-col gap-1 mb-3">
            {trucks.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTruck(t)}
                className={`text-left text-xs px-2 py-1.5 rounded border transition-colors ${selectedTruck.id === t.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:bg-muted"}`}
                data-testid={`truck-${t.id}`}
              >{t.name}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-muted-foreground">Width</span>
            <span className="font-mono text-foreground">{selectedTruck.width}m</span>
            <span className="text-muted-foreground">Length</span>
            <span className="font-mono text-foreground">{selectedTruck.length}m</span>
            <span className="text-muted-foreground">Turn Radius</span>
            <span className="font-mono text-primary">{selectedTruck.turningRadius}m</span>
            <span className="text-muted-foreground">Spacing X</span>
            <span className="font-mono text-foreground">{selectedTruck.spacingX}m</span>
            <span className="text-muted-foreground">Spacing Y</span>
            <span className="font-mono text-foreground">{selectedTruck.spacingY}m</span>
            <span className="text-muted-foreground">Payload</span>
            <span className="font-mono text-foreground">{selectedTruck.payloadTonnes}t</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Optimization</div>
          <label className="text-xs text-muted-foreground block mb-1">
            Rotation Step: <span className="text-foreground font-mono">{rotStep}°</span>
          </label>
          <input
            type="range" min={1} max={15} value={rotStep}
            onChange={(e) => {
              const v = Number(e.target.value); setRotStep(v);
              if (polygon.length >= 3) setResult(runLocalEngine(polygon, selectedTruck, v));
            }}
            className="w-full accent-primary mb-3"
            data-testid="slider-rotation-step"
          />
          <button
            onClick={generatePlan}
            disabled={polygon.length < 3 || generateMutation.isPending}
            className="w-full text-sm py-2 bg-primary text-primary-foreground rounded font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
            data-testid="button-generate-plan"
          >{generateMutation.isPending ? "Optimizing..." : "Generate Plan"}</button>
        </div>

        {/* Metrics */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded p-3"
          >
            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Results</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <span className="text-muted-foreground">Hex Spots</span>
              <span className="font-mono text-primary font-bold">{result.metrics.spotCount}</span>
              <span className="text-muted-foreground">Grid Spots</span>
              <span className="font-mono text-foreground">{result.metrics.squareGridCount}</span>
              <span className="text-muted-foreground">Improvement</span>
              <span className={`font-mono font-bold ${result.metrics.improvementPercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                +{result.metrics.improvementPercent.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">Best Angle</span>
              <span className="font-mono text-foreground">{result.bestRotation}°</span>
              <span className="text-muted-foreground">Lanes</span>
              <span className="font-mono text-foreground">{result.lanes.length}</span>
              <span className="text-muted-foreground">Inset Area</span>
              <span className="font-mono text-foreground">{result.metrics.insetArea.toFixed(0)}m²</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-muted-foreground">
            {result ? `${result.spots.length} spots across ${result.lanes.length} lanes — best rotation ${result.bestRotation}°` : "Draw or load a polygon to start"}
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-amber-500"></span>Inset</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-slate-400"></span>Polygon</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-primary/60"></span>Spot</span>
          </div>
        </div>
        <div ref={canvasContainerRef} className="relative flex-1 bg-[#0b0e15] border border-border rounded overflow-hidden">
          <PackingCanvas
            polygon={polygon}
            insetPolygon={result?.insetPolygon ?? []}
            spots={result?.spots ?? []}
            lanes={result?.lanes ?? []}
            onCanvasClick={addVertex}
            onSpotClick={(spot) => setTooltip({ spot, screenX: 0, screenY: 0 })}
          />
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-4 right-4 bg-card border border-border rounded p-3 text-xs font-mono z-10 shadow-lg min-w-[160px]"
              data-testid="spot-tooltip"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-primary font-bold">Spot #{tooltip.spot.id}</span>
                <button onClick={() => setTooltip(null)} className="text-muted-foreground hover:text-foreground text-xs">x</button>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <span className="text-muted-foreground">Lane</span><span className="text-foreground">{tooltip.spot.laneId}</span>
                <span className="text-muted-foreground">Seq/Lane</span><span className="text-foreground">{tooltip.spot.sequenceInLane}</span>
                <span className="text-muted-foreground">Global</span><span className="text-foreground">{tooltip.spot.globalSequence}</span>
                <span className="text-muted-foreground">Rotation</span><span className="text-foreground">{tooltip.spot.rotation}°</span>
                <span className="text-muted-foreground">X</span><span className="text-foreground">{tooltip.spot.x.toFixed(1)}m</span>
                <span className="text-muted-foreground">Y</span><span className="text-foreground">{tooltip.spot.y.toFixed(1)}m</span>
                <span className="text-muted-foreground">Safe</span><span className={tooltip.spot.safe ? "text-green-400" : "text-red-400"}>{tooltip.spot.safe ? "Yes" : "No"}</span>
              </div>
            </motion.div>
          )}
        </div>
        {result && result.rotationScores.length > 0 && (
          <div className="h-14 bg-card border border-border rounded px-3 py-2 flex items-end gap-px overflow-hidden">
            <div className="text-xs text-muted-foreground mr-2 shrink-0 self-center">Rotation</div>
            {result.rotationScores.map((s) => {
              const max = Math.max(...result.rotationScores.map((r) => r.spotCount), 1);
              const h = Math.round((s.spotCount / max) * 32);
              return (
                <div key={s.angle} className="flex flex-col items-center gap-0.5" style={{ minWidth: 18 }}>
                  <div
                    className={`w-full rounded-t transition-all ${s.angle === result.bestRotation ? "bg-primary" : "bg-secondary"}`}
                    style={{ height: h }}
                    title={`${s.angle}°: ${s.spotCount} spots`}
                  />
                  <span className="text-[9px] text-muted-foreground font-mono">{s.angle}°</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
