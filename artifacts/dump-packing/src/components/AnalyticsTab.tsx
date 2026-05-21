import { useGetBenchmark, useGetDensityGap, getGetBenchmarkQueryKey, getGetDensityGapQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Cell, RadialBarChart, RadialBar } from "recharts";
import { usePlanContext } from "@/lib/planContext";

function StatCard({ label, value, sub, accent = false, dim = false }: {
  label: string; value: string; sub?: string; accent?: boolean; dim?: boolean;
}) {
  return (
    <div className={`bg-card border rounded p-4 ${accent ? "border-primary/50" : "border-border"} ${dim ? "opacity-50" : ""}`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-mono font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export default function AnalyticsTab() {
  const { currentPlan } = usePlanContext();

  const { data: benchmark } = useGetBenchmark(undefined, { query: { queryKey: getGetBenchmarkQueryKey() } });
  const { data: densityGap } = useGetDensityGap(undefined, { query: { queryKey: getGetDensityGapQueryKey() } });

  const hasPlan = currentPlan != null && currentPlan.metrics.spotCount > 0;

  // Dynamic data from current planner plan
  const planMetrics = currentPlan?.metrics;
  const rotScores   = currentPlan?.rotationScores ?? [];
  const maxRot      = Math.max(...rotScores.map((r) => r.spotCount), 1);

  const effData = [
    { name: "Hex (Optimal)", value: 90.7, color: "#f59e0b" },
    { name: "Square Grid",   value: 78.5, color: "#475569" },
  ];

  const spacingData = [
    { name: "Autonomous", value: densityGap?.autonomousSpacing ?? 7.38, color: "#ef4444" },
    { name: "Staffed",    value: densityGap?.staffedSpacing    ?? 3.03, color: "#10b981" },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">

      {/* ── Current plan analytics (dynamic) ── */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider">Current Plan — Live Analytics</div>
          {!hasPlan && (
            <span className="text-xs text-muted-foreground italic">
              (Open the Planner tab, load a polygon and run optimization to see live data here)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="Hex Spots" value={hasPlan ? String(planMetrics!.spotCount) : "—"} sub="Optimal hex packing" accent dim={!hasPlan} />
          <StatCard label="Square Grid" value={hasPlan ? String(planMetrics!.squareGridCount) : "—"} sub="Baseline comparison" dim={!hasPlan} />
          <StatCard label="Improvement" value={hasPlan ? `+${planMetrics!.improvementPercent.toFixed(1)}%` : "—"} sub="vs square grid" accent dim={!hasPlan} />
          <StatCard label="Best Rotation" value={hasPlan ? `${currentPlan!.bestRotation}°` : "—"} sub="Optimal hex angle" dim={!hasPlan} />
        </div>

        <AnimatePresence>
          {hasPlan && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">

              {/* Rotation sweep chart */}
              <div className="bg-card border border-border rounded p-4">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Rotation Sweep — Current Plan</div>
                <div className="flex items-end gap-1 h-28">
                  {rotScores.map((s) => {
                    const h = Math.max(4, Math.round((s.spotCount / maxRot) * 80));
                    const isBest = s.angle === currentPlan!.bestRotation;
                    return (
                      <div key={s.angle} className="flex flex-col items-center gap-0.5 flex-1 min-w-0" title={`${s.angle}°: ${s.spotCount} spots`}>
                        <div className={`w-full rounded-t ${isBest ? "bg-primary" : "bg-secondary"}`} style={{ height: h }} />
                        <span className="text-[8px] text-muted-foreground font-mono">{s.angle}°</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0° worst</span>
                  <span className="text-primary font-mono">★ {currentPlan!.bestRotation}° optimal ({planMetrics!.spotCount} spots)</span>
                </div>
              </div>

              {/* Plan metrics detail */}
              <div className="bg-card border border-border rounded p-4">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Plan Detail</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Polygon Area</span>
                  <span className="font-mono">{planMetrics!.totalArea.toFixed(0)} m²</span>
                  <span className="text-muted-foreground">Inset Area</span>
                  <span className="font-mono">{planMetrics!.insetArea.toFixed(0)} m²</span>
                  <span className="text-muted-foreground">Inset Efficiency</span>
                  <span className="font-mono">{planMetrics!.totalArea > 0 ? ((planMetrics!.insetArea / planMetrics!.totalArea) * 100).toFixed(1) : "—"}%</span>
                  <span className="text-muted-foreground">Lanes</span>
                  <span className="font-mono">{currentPlan!.lanes.length}</span>
                  <span className="text-muted-foreground">Hex Efficiency</span>
                  <span className="font-mono text-primary">{(planMetrics!.hexPackEfficiency * 100).toFixed(1)}%</span>
                  <span className="text-muted-foreground">Square Efficiency</span>
                  <span className="font-mono">{(planMetrics!.squarePackEfficiency * 100).toFixed(1)}%</span>
                  <span className="text-muted-foreground">Spots / 100m²</span>
                  <span className="font-mono">{planMetrics!.insetArea > 0 ? ((planMetrics!.spotCount / planMetrics!.insetArea) * 100).toFixed(2) : "—"}</span>
                  <span className="text-muted-foreground">Hex gain (abs)</span>
                  <span className="font-mono text-green-400">+{planMetrics!.spotCount - planMetrics!.squareGridCount} spots</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-border" />

      {/* ── System-wide benchmarks (always visible) ── */}
      <div>
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
          System Benchmarks — Density Gap Analysis
          <span className="ml-2 text-muted-foreground font-normal normal-case tracking-normal">
            (computed from all polygon × truck combinations)
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="Autonomous Spacing" value={`${densityGap?.autonomousSpacing ?? 7.38}m`} sub="Current avg dump gap" />
          <StatCard label="Staffed Spacing"    value={`${densityGap?.staffedSpacing ?? 3.03}m`}   sub="Human-operated avg gap" />
          <StatCard label="Density Gap Ratio"  value={`${densityGap?.densityGapRatio?.toFixed(1) ?? "2.4"}×`} sub="How much worse autonomous is" accent />
          <StatCard label="Avg Improvement"    value={`+${benchmark?.summary?.avgImprovementPercent?.toFixed(1) ?? "15"}%`} sub="Hex vs square across all runs" accent />
        </div>

        {/* Side-by-side charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-card border border-border rounded p-4">
            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Packing Efficiency</div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={effData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis domain={[60, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <RTooltip
                    contentStyle={{ background: "#1e2533", border: "1px solid #334155", borderRadius: 4, fontSize: 12 }}
                    formatter={(v: number) => [`${v}%`, "Efficiency"]}
                  />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {effData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded p-4">
            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Dump Spacing Comparison</div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spacingData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}m`} />
                  <RTooltip
                    contentStyle={{ background: "#1e2533", border: "1px solid #334155", borderRadius: 4, fontSize: 12 }}
                    formatter={(v: number) => [`${v}m`, "Spacing"]}
                  />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {spacingData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* KPI table */}
        {densityGap?.kpis && (
          <div className="bg-card border border-border rounded p-4 mb-4">
            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Key Performance Indicators</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-2 font-medium">Metric</th>
                    <th className="text-left py-2 font-medium">Before (Autonomous)</th>
                    <th className="text-left py-2 font-medium">After (Optimized)</th>
                    <th className="text-left py-2 font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {densityGap.kpis.map((kpi, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-2 font-medium">{kpi.label}</td>
                      <td className="py-2 text-red-400 font-mono">{kpi.before}</td>
                      <td className="py-2 text-green-400 font-mono">{kpi.after}</td>
                      <td className="py-2 text-muted-foreground">{kpi.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Benchmark scenarios table */}
        {benchmark?.scenarios && (
          <div className="bg-card border border-border rounded p-4">
            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
              All Scenarios — Hex vs Square Grid
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-2 font-medium">Polygon</th>
                    <th className="text-left py-2 font-medium">Truck</th>
                    <th className="text-right py-2 font-medium">Hex</th>
                    <th className="text-right py-2 font-medium">Grid</th>
                    <th className="text-right py-2 font-medium">Gain</th>
                    <th className="text-right py-2 font-medium">Angle</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmark.scenarios.map((s, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-2">{s.polygonName}</td>
                      <td className="py-2 text-muted-foreground font-mono">{s.truckId}</td>
                      <td className="py-2 text-right text-primary font-mono font-bold">{s.hexSpots}</td>
                      <td className="py-2 text-right font-mono">{s.squareSpots}</td>
                      <td className="py-2 text-right font-mono">
                        <span className={s.improvementPercent >= 0 ? "text-green-400" : "text-red-400"}>
                          +{s.improvementPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 text-right text-muted-foreground font-mono">{s.bestRotation}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span>Avg: <span className="text-green-400 font-mono">+{benchmark.summary.avgImprovementPercent.toFixed(1)}%</span></span>
              <span>Max: <span className="text-green-400 font-mono">+{benchmark.summary.maxImprovementPercent.toFixed(1)}%</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
