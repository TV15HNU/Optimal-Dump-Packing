import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanContext } from "@/lib/planContext";
import { TRUCK_CYCLE_TIMES, DEFAULT_CYCLE_TIME } from "@/engine/localEngine";
import type { LocalPackResult } from "@/engine/localEngine";

function StatCard({ label, value, sub, accent = false, dim = false }: {
  label: string; value: string; sub?: string; accent?: boolean; dim?: boolean;
}) {
  return (
    <div className={`bg-card border rounded p-4 ${accent ? "border-primary/50" : "border-border"} ${dim ? "opacity-40" : ""}`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-mono font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function fmtTime(totalMins: number): string {
  if (totalMins < 60) return `${Math.round(totalMins)} min`;
  const h = Math.floor(totalMins / 60), m = Math.round(totalMins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function PlanMetrics({ plan, truckId, mode }: { plan: LocalPackResult; truckId: string | null; mode: 'planner' | 'map' }) {
  const [fleetSize, setFleetSize] = useState(3);
  const planMetrics = plan.metrics;
  const rotScores   = plan.rotationScores ?? [];
  const maxRot      = Math.max(...rotScores.map((r) => r.spotCount), 1);

  const cycleTimeMins = truckId ? (TRUCK_CYCLE_TIMES[truckId] ?? DEFAULT_CYCLE_TIME) : DEFAULT_CYCLE_TIME;
  const spots        = planMetrics.spotCount;
  const totalMins    = Math.ceil(spots / fleetSize) * cycleTimeMins;
  const minTimeMins  = Math.ceil(spots / Math.min(fleetSize, spots || 1)) * (cycleTimeMins * 0.8);
  const maxTimeMins  = Math.ceil(spots / Math.max(1, fleetSize - 1)) * (cycleTimeMins * 1.3);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Hex Spots"     value={String(planMetrics.spotCount)} sub="Optimal hex packing" accent />
        <StatCard label="Grid Spots"    value={String(planMetrics.squareGridCount)} sub="Square grid baseline" />
        <StatCard label="Improvement"   value={`+${planMetrics.improvementPercent.toFixed(1)}%`} sub="vs square grid" accent />
        <StatCard label="Best Rotation" value={`${plan.bestRotation}°`} sub="Optimal hex angle" />
      </div>

      {/* Rotation sweep */}
      <div className="bg-card border border-border rounded p-4">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Rotation Sweep</div>
        <div className="flex items-end gap-1 h-28">
          {rotScores.map((s) => {
            const h = Math.max(4, Math.round((s.spotCount / maxRot) * 80));
            const isBest = s.angle === plan.bestRotation;
            return (
              <div key={s.angle} className="flex flex-col items-center gap-0.5 flex-1 min-w-0"
                title={`${s.angle}°: ${s.spotCount} spots`}>
                <div className={`w-full rounded-t ${isBest ? "bg-primary" : "bg-slate-600"}`} style={{ height: h }} />
                <span className="text-[8px] text-muted-foreground font-mono">{s.angle}°</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span className="italic">0–60° is mathematically complete for hex packing (60° symmetry)</span>
          <span className="text-primary font-mono">★ {plan.bestRotation}° → {planMetrics.spotCount} spots</span>
        </div>
      </div>

      {/* Detail + Fill Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded p-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Plan Detail</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <span className="text-muted-foreground">Polygon Area</span>
            <span className="font-mono">{planMetrics.totalArea.toFixed(0)} m²</span>
            <span className="text-muted-foreground">Inset Area</span>
            <span className="font-mono">{planMetrics.insetArea.toFixed(0)} m²</span>
            <span className="text-muted-foreground">Inset Efficiency</span>
            <span className="font-mono">{planMetrics.totalArea > 0 ? ((planMetrics.insetArea / planMetrics.totalArea) * 100).toFixed(1) : "—"}%</span>
            <span className="text-muted-foreground">Lanes</span>
            <span className="font-mono">{plan.lanes.length}</span>
            <span className="text-muted-foreground">Spots / 100m²</span>
            <span className="font-mono">{planMetrics.insetArea > 0 ? ((planMetrics.spotCount / planMetrics.insetArea) * 100).toFixed(2) : "—"}</span>
            <span className="text-muted-foreground">Hex gain</span>
            <span className="font-mono text-green-400">+{planMetrics.spotCount - planMetrics.squareGridCount} spots</span>
            <span className="text-muted-foreground">Entry point</span>
            <span className={`font-mono ${plan.entryPoint ? "text-green-400" : "text-muted-foreground italic"}`}>
              {plan.entryPoint ? `(${plan.entryPoint.x.toFixed(0)}, ${plan.entryPoint.y.toFixed(0)})` : "not set"}
            </span>
            <span className="text-muted-foreground">Exit point</span>
            <span className={`font-mono ${plan.exitPoint ? "text-red-400" : "text-muted-foreground italic"}`}>
              {plan.exitPoint ? `(${plan.exitPoint.x.toFixed(0)}, ${plan.exitPoint.y.toFixed(0)})` : "not set"}
            </span>
          </div>
        </div>

        <div className="bg-card border border-primary/30 rounded p-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
            Estimated Fill Time
            <span className="text-muted-foreground font-normal normal-case tracking-normal ml-2">(industry benchmark)</span>
          </div>
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">
              Fleet size: <span className="font-mono text-foreground">{fleetSize} trucks</span>
            </label>
            <input type="range" min={1} max={10} value={fleetSize}
              onChange={(e) => setFleetSize(Number(e.target.value))}
              className="w-full accent-primary" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>1</span><span>10 trucks</span>
            </div>
          </div>
          <div className="bg-secondary rounded p-3 mb-3">
            <div className="text-3xl font-mono font-bold text-primary mb-1">{fmtTime(totalMins)}</div>
            <div className="text-xs text-muted-foreground">Estimated total fill time</div>
            <div className="text-xs text-muted-foreground mt-1 font-mono">
              Range: {fmtTime(minTimeMins)} – {fmtTime(maxTimeMins)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-muted-foreground">Cycle time/spot</span> <span className="font-mono">{cycleTimeMins} min</span>
            <span className="text-muted-foreground">Total spots</span>     <span className="font-mono">{spots}</span>
            <span className="text-muted-foreground">Fleet size</span>      <span className="font-mono">{fleetSize} trucks</span>
            <span className="text-muted-foreground">Trips/truck</span>     <span className="font-mono">{Math.ceil(spots / fleetSize)}</span>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground leading-snug border-t border-border pt-2">
            Caterpillar MineStar benchmarks (2023). Actual times vary ±20–30%.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsTab() {
  const { currentPlan, selectedTruck, mapPlan } = usePlanContext();
  const [mode, setMode] = useState<'planner' | 'map'>('planner');

  const plan = mode === 'planner' ? currentPlan : mapPlan;
  const truckId = selectedTruck?.id ?? null;
  const hasPlan = plan != null && plan.metrics.spotCount > 0;

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">

      {/* Mode toggle */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-secondary rounded p-1">
          <button onClick={() => setMode('planner')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${mode === 'planner' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Planner
          </button>
          <button onClick={() => setMode('map')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${mode === 'map' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Map / GPS
          </button>
        </div>
        <div className="text-xs font-semibold text-primary uppercase tracking-wider">
          {mode === 'planner' ? 'Planner — Live Analytics' : 'Map / GPS — Live Analytics'}
        </div>
      </div>

      {!hasPlan && (
        <div className="text-xs text-muted-foreground italic bg-card border border-border rounded p-3">
          {mode === 'planner'
            ? "Load a polygon in the Planner tab and run optimization to see live data here."
            : "Add GPS coordinates in the Map / GPS tab and generate a plan to see data here."}
        </div>
      )}

      <AnimatePresence mode="wait">
        {hasPlan && (
          <motion.div key={mode} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PlanMetrics plan={plan!} truckId={truckId} mode={mode} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
