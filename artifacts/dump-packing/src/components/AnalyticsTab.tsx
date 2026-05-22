import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanContext } from "@/lib/planContext";
import { TRUCK_CYCLE_TIMES, DEFAULT_CYCLE_TIME } from "@/engine/localEngine";

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
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function AnalyticsTab() {
  const { currentPlan, selectedTruck } = usePlanContext();
  const [fleetSize, setFleetSize] = useState(3);

  const hasPlan = currentPlan != null && currentPlan.metrics.spotCount > 0;
  const planMetrics = currentPlan?.metrics;
  const rotScores   = currentPlan?.rotationScores ?? [];
  const maxRot      = Math.max(...rotScores.map((r) => r.spotCount), 1);

  // Estimated fill time
  const cycleTimeMins = selectedTruck
    ? (TRUCK_CYCLE_TIMES[selectedTruck.id] ?? DEFAULT_CYCLE_TIME)
    : DEFAULT_CYCLE_TIME;
  const truckName = selectedTruck?.name ?? "standard truck";
  const spots = planMetrics?.spotCount ?? 0;
  // With fleetSize trucks running in parallel, time = ceil(spots / fleetSize) * cycleTime
  const totalMins   = Math.ceil(spots / fleetSize) * cycleTimeMins;
  const minTimeMins = Math.ceil(spots / Math.min(fleetSize, spots || 1)) * (cycleTimeMins * 0.8);
  const maxTimeMins = Math.ceil(spots / Math.max(1, fleetSize - 1)) * (cycleTimeMins * 1.3);

  return (
    <div className="flex flex-col gap-5 p-4 overflow-y-auto h-full">

      <div className="flex items-center gap-3">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider">
          Current Plan — Live Analytics
        </div>
        {!hasPlan && (
          <span className="text-xs text-muted-foreground italic">
            Load a polygon in the Planner tab and run optimization to see live data here
          </span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Hex Spots"     value={hasPlan ? String(planMetrics!.spotCount) : "—"}                              sub="Optimal hex packing"   accent dim={!hasPlan} />
        <StatCard label="Grid Spots"    value={hasPlan ? String(planMetrics!.squareGridCount) : "—"}                        sub="Square grid baseline"  dim={!hasPlan} />
        <StatCard label="Improvement"   value={hasPlan ? `+${planMetrics!.improvementPercent.toFixed(1)}%` : "—"}           sub="vs square grid"        accent dim={!hasPlan} />
        <StatCard label="Best Rotation" value={hasPlan ? `${currentPlan!.bestRotation}°` : "—"}                            sub="Optimal hex angle"     dim={!hasPlan} />
      </div>

      <AnimatePresence>
        {hasPlan && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-4">

            {/* Rotation sweep chart */}
            <div className="bg-card border border-border rounded p-4">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                Rotation Sweep — Current Plan
              </div>
              <div className="flex items-end gap-1 h-28">
                {rotScores.map((s) => {
                  const h = Math.max(4, Math.round((s.spotCount / maxRot) * 80));
                  const isBest = s.angle === currentPlan!.bestRotation;
                  return (
                    <div key={s.angle} className="flex flex-col items-center gap-0.5 flex-1 min-w-0"
                      title={`${s.angle}°: ${s.spotCount} spots`}>
                      <div className={`w-full rounded-t transition-all ${isBest ? "bg-primary" : "bg-slate-600"}`}
                        style={{ height: h }} />
                      <span className="text-[8px] text-muted-foreground font-mono">{s.angle}°</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span className="italic">0–60° is mathematically complete for hex packing (60° symmetry)</span>
                <span className="text-primary font-mono">★ {currentPlan!.bestRotation}° → {planMetrics!.spotCount} spots</span>
              </div>
            </div>

            {/* Plan detail metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded p-4">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Plan Detail</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Polygon Area</span>
                  <span className="font-mono">{planMetrics!.totalArea.toFixed(0)} m²</span>
                  <span className="text-muted-foreground">Inset Area</span>
                  <span className="font-mono">{planMetrics!.insetArea.toFixed(0)} m²</span>
                  <span className="text-muted-foreground">Inset Efficiency</span>
                  <span className="font-mono">
                    {planMetrics!.totalArea > 0 ? ((planMetrics!.insetArea / planMetrics!.totalArea) * 100).toFixed(1) : "—"}%
                  </span>
                  <span className="text-muted-foreground">Lanes</span>
                  <span className="font-mono">{currentPlan!.lanes.length}</span>
                  <span className="text-muted-foreground">Spots / 100m²</span>
                  <span className="font-mono">
                    {planMetrics!.insetArea > 0 ? ((planMetrics!.spotCount / planMetrics!.insetArea) * 100).toFixed(2) : "—"}
                  </span>
                  <span className="text-muted-foreground">Hex gain</span>
                  <span className="font-mono text-green-400">+{planMetrics!.spotCount - planMetrics!.squareGridCount} spots</span>
                  <span className="text-muted-foreground">Entry point</span>
                  <span className={`font-mono ${currentPlan!.entryPoint ? "text-green-400" : "text-muted-foreground italic"}`}>
                    {currentPlan!.entryPoint ? `(${currentPlan!.entryPoint.x.toFixed(0)}, ${currentPlan!.entryPoint.y.toFixed(0)})` : "not set"}
                  </span>
                  <span className="text-muted-foreground">Exit point</span>
                  <span className={`font-mono ${currentPlan!.exitPoint ? "text-red-400" : "text-muted-foreground italic"}`}>
                    {currentPlan!.exitPoint ? `(${currentPlan!.exitPoint.x.toFixed(0)}, ${currentPlan!.exitPoint.y.toFixed(0)})` : "not set"}
                  </span>
                </div>
              </div>

              {/* Estimated fill time */}
              <div className="bg-card border border-primary/30 rounded p-4">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                  Estimated Fill Time
                  <span className="text-muted-foreground font-normal normal-case tracking-normal ml-2">
                    (industry benchmark)
                  </span>
                </div>

                <div className="mb-3">
                  <label className="text-xs text-muted-foreground block mb-1">
                    Fleet size: <span className="font-mono text-foreground">{fleetSize} trucks</span>
                  </label>
                  <input type="range" min={1} max={10} value={fleetSize}
                    onChange={(e) => setFleetSize(Number(e.target.value))}
                    className="w-full accent-primary" />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                    <span>1 truck</span><span>10 trucks</span>
                  </div>
                </div>

                <div className="bg-secondary rounded p-3 mb-3">
                  <div className="text-3xl font-mono font-bold text-primary mb-1">
                    {hasPlan ? fmtTime(totalMins) : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Estimated total fill time
                  </div>
                  {hasPlan && (
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      Range: {fmtTime(minTimeMins)} – {fmtTime(maxTimeMins)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Truck model</span>
                  <span className="font-mono">{truckName}</span>
                  <span className="text-muted-foreground">Cycle time/spot</span>
                  <span className="font-mono">{cycleTimeMins} min</span>
                  <span className="text-muted-foreground">Total spots</span>
                  <span className="font-mono">{spots}</span>
                  <span className="text-muted-foreground">Fleet size</span>
                  <span className="font-mono">{fleetSize} trucks</span>
                  <span className="text-muted-foreground">Trips/truck</span>
                  <span className="font-mono">{hasPlan ? Math.ceil(spots / fleetSize) : "—"}</span>
                </div>

                <div className="mt-3 text-[11px] text-muted-foreground leading-snug border-t border-border pt-2">
                  Cycle time includes: truck positioning, reversing to spot, tipping, and clearing.
                  Industry source: Caterpillar MineStar benchmarks (2023). Actual times vary ±20–30% with terrain and payload.
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
