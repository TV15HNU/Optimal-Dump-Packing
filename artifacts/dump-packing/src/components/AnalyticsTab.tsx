import { useGetBenchmark, useGetDensityGap, getGetBenchmarkQueryKey, getGetDensityGapQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

function StatCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`bg-card border rounded p-4 ${accent ? "border-primary/40" : "border-border"}`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-mono font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export default function AnalyticsTab() {
  const { data: benchmark, isLoading: benchLoading } = useGetBenchmark(undefined, {
    query: { queryKey: getGetBenchmarkQueryKey() }
  });
  const { data: densityGap, isLoading: gapLoading } = useGetDensityGap(undefined, {
    query: { queryKey: getGetDensityGapQueryKey() }
  });

  const isLoading = benchLoading || gapLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading analytics...
      </div>
    );
  }

  const efficiencyData = [
    { name: "Hex Packing", value: 90.7, color: "#f59e0b" },
    { name: "Square Grid", value: 78.5, color: "#475569" },
  ];

  const spacingData = [
    { name: "Autonomous", value: densityGap?.autonomousSpacing ?? 7.38, color: "#ef4444" },
    { name: "Staffed", value: densityGap?.staffedSpacing ?? 3.03, color: "#10b981" },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      {/* KPI Cards */}
      <div>
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Density Gap Analysis</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Autonomous Spacing"
            value={`${densityGap?.autonomousSpacing ?? 7.38}m`}
            sub="Current avg dump gap" accent={false}
          />
          <StatCard
            label="Staffed Spacing"
            value={`${densityGap?.staffedSpacing ?? 3.03}m`}
            sub="Human-operated avg gap" accent={false}
          />
          <StatCard
            label="Density Gap Ratio"
            value={`${densityGap?.densityGapRatio?.toFixed(1) ?? "2.4"}x`}
            sub="How much worse autonomous is" accent
          />
          <StatCard
            label="Packing Improvement"
            value={`+${benchmark?.summary?.avgImprovementPercent?.toFixed(1) ?? "15"}%`}
            sub="Hex vs square grid avg" accent
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Packing Efficiency */}
        <div className="bg-card border border-border rounded p-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Packing Efficiency</div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={efficiencyData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis domain={[60, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <RTooltip
                  contentStyle={{ background: "#1e2533", border: "1px solid #334155", borderRadius: 4, fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, "Efficiency"]}
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {efficiencyData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block"></span><span className="text-muted-foreground">Hex: <span className="text-foreground font-mono">90.7%</span></span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-slate-600 inline-block"></span><span className="text-muted-foreground">Square: <span className="text-foreground font-mono">78.5%</span></span></div>
          </div>
        </div>

        {/* Spacing Comparison */}
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

      {/* KPIs Table */}
      {densityGap?.kpis && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded p-4">
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
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-2 text-foreground font-medium">{kpi.label}</td>
                    <td className="py-2 text-red-400 font-mono">{kpi.before}</td>
                    <td className="py-2 text-green-400 font-mono">{kpi.after}</td>
                    <td className="py-2 text-muted-foreground">{kpi.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Benchmark Table */}
      {benchmark?.scenarios && (
        <div className="bg-card border border-border rounded p-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
            Benchmark Results — Hex vs Square Grid
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-2 font-medium">Polygon</th>
                  <th className="text-left py-2 font-medium">Truck</th>
                  <th className="text-right py-2 font-medium">Hex Spots</th>
                  <th className="text-right py-2 font-medium">Grid Spots</th>
                  <th className="text-right py-2 font-medium">Improvement</th>
                  <th className="text-right py-2 font-medium">Best Angle</th>
                </tr>
              </thead>
              <tbody>
                {benchmark.scenarios.map((s, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-2 text-foreground">{s.polygonName}</td>
                    <td className="py-2 text-muted-foreground font-mono">{s.truckId}</td>
                    <td className="py-2 text-right text-primary font-mono font-bold">{s.hexSpots}</td>
                    <td className="py-2 text-right text-foreground font-mono">{s.squareSpots}</td>
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
            <span>Avg improvement: <span className="text-green-400 font-mono">+{benchmark.summary.avgImprovementPercent.toFixed(1)}%</span></span>
            <span>Max improvement: <span className="text-green-400 font-mono">+{benchmark.summary.maxImprovementPercent.toFixed(1)}%</span></span>
          </div>
        </div>
      )}

      {/* Root Cause */}
      {densityGap && (
        <div className="bg-card border border-border rounded p-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Engineering Analysis</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-muted-foreground mb-1 font-medium">Root Cause</div>
              <div className="text-foreground leading-relaxed">{densityGap.rootCause}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 font-medium">Innovation</div>
              <div className="text-foreground leading-relaxed">{densityGap.innovationDescription}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
