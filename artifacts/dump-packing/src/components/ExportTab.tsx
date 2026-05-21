import { useState } from "react";
import { motion } from "framer-motion";
import { useExportPlan } from "@workspace/api-client-react";
import { runLocalEngine, DEFAULT_TRUCKS } from "@/engine/localEngine";

const SAMPLE_POLYGON = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 150 }, { x: 0, y: 150 }];

const PHASES = [
  {
    phase: "Phase 1", status: "Current", label: "MVP — Polygon Spot-Point Packing",
    items: ["Polygon-aware hex packing", "Turning-radius inset buffering", "Rotation optimization (0-60°)", "Lane assignment & dispatch sequencing", "GPS polygon input via Leaflet", "Real-time simulation dashboard", "Export to structured JSON"],
    color: "text-green-400", border: "border-green-500/30",
  },
  {
    phase: "Phase 2", status: "Near-Term", label: "Dynamic Mixed-Fleet Planning",
    items: ["V2X communication integration", "Live payload telemetry", "Multi-truck simultaneous optimization", "Dynamic replanning mid-shift", "Variable lane widths per truck class"],
    color: "text-amber-400", border: "border-amber-500/30",
  },
  {
    phase: "Phase 3", status: "Long-Term", label: "Perception-Driven Autonomous Planning",
    items: ["LiDAR terrain mapping", "Semantic segmentation of dump surface", "Distributed agent coordination", "Onboard decision systems", "3D pile deformation modelling"],
    color: "text-blue-400", border: "border-blue-500/30",
  },
];

const ARCH_LAYERS = [
  { name: "Frontend", desc: "React + Canvas + Leaflet", detail: "Interactive polygon editor, simulation dashboard, analytics, map overlay" },
  { name: "API Gateway", desc: "Express 5 REST API", detail: "JSON contract, request validation via Zod, CORS, structured logging" },
  { name: "Optimization Engine", desc: "TypeScript geometry algorithms", detail: "Hex packing, polygon inset, rotation sweep, lane scheduling, dispatch sequencing" },
  { name: "Geometry Core", desc: "Pure computational geometry", detail: "Point-in-polygon, inset buffering, centroid, bounding box, polygon area" },
];

const TALKING_POINTS = [
  { label: "Core Innovation", text: "Turning radius encoded geometrically as polygon inset — no hardware changes required." },
  { label: "Density Problem", text: "The gap is fundamentally a geometric planning problem, not a hardware or sensor problem." },
  { label: "Algorithm", text: "Hexagonal close packing achieves 90.7% theoretical efficiency vs 78.5% for square grids." },
  { label: "Scope", text: "Phase 1 intentionally scopes to 2D top-surface spatial planning — deterministic and explainable." },
  { label: "Deployment", text: "Pure software. No truck hardware changes. Drop-in improvement to existing autonomous fleets." },
];

export default function ExportTab() {
  const exportMutation = useExportPlan();
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
    const localPlan = runLocalEngine(SAMPLE_POLYGON, DEFAULT_TRUCKS[0], 5);
    try {
      const result = await exportMutation.mutateAsync({
        data: {
          plan: {
            spots: localPlan.spots as any,
            lanes: localPlan.lanes as any,
            polygon: localPlan.polygon,
            insetPolygon: localPlan.insetPolygon,
            bestRotation: localPlan.bestRotation,
            rotationScores: localPlan.rotationScores,
            metrics: localPlan.metrics,
            truckProfile: DEFAULT_TRUCKS[0] as any,
            generatedAt: new Date().toISOString(),
          }
        }
      });
      // Trigger download
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = result.filename;
      a.click(); URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (e) {
      // fallback: download local plan
      const blob = new Blob([JSON.stringify(localPlan, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "dump-plan.json"; a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      {/* Export Panel */}
      <div className="bg-card border border-border rounded p-4">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Export Dump Plan</div>
        <p className="text-sm text-muted-foreground mb-4">Export the current optimized plan as a structured JSON file compatible with fleet management systems.</p>
        <button
          onClick={handleExport}
          disabled={exportMutation.isPending}
          className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded hover:opacity-90 transition-opacity disabled:opacity-40"
          data-testid="button-export-json"
        >
          {exportMutation.isPending ? "Exporting..." : exported ? "Downloaded" : "Export Plan JSON"}
        </button>
        {exported && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-green-400">
            Plan exported successfully.
          </motion.div>
        )}
        <div className="mt-4 text-xs text-muted-foreground">
          Export format includes: truck profile, polygon vertices, inset polygon, all spot coordinates with lane/sequence metadata, rotation scores, and density metrics. Suitable for CAT MineStar integration in Phase 2.
        </div>
      </div>

      {/* Phase Roadmap */}
      <div>
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Phase Roadmap</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PHASES.map((p) => (
            <div key={p.phase} className={`bg-card border ${p.border} rounded p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-bold ${p.color}`}>{p.phase}</span>
                <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">{p.status}</span>
              </div>
              <div className="text-sm text-foreground font-medium mb-3">{p.label}</div>
              <ul className="space-y-1">
                {p.items.map((item, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className={`mt-0.5 shrink-0 ${p.color}`}>-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* System Architecture */}
      <div>
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">System Architecture</div>
        <div className="flex flex-col gap-2">
          {ARCH_LAYERS.map((l, i) => (
            <div key={i} className="flex items-stretch bg-card border border-border rounded overflow-hidden">
              <div className="w-1 bg-primary shrink-0" />
              <div className="flex items-center gap-4 p-3 flex-1">
                <div className="w-36 shrink-0">
                  <div className="text-sm font-semibold text-foreground">{l.name}</div>
                  <div className="text-xs text-primary font-mono">{l.desc}</div>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">{l.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Talking Points */}
      <div>
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Key Engineering Messages</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TALKING_POINTS.map((t, i) => (
            <div key={i} className="bg-card border border-border rounded p-3">
              <div className="text-xs font-semibold text-primary mb-1">{t.label}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{t.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
