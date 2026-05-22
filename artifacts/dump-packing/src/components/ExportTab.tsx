import { useState } from "react";
import { motion } from "framer-motion";
import { useExportPlan } from "@workspace/api-client-react";
import { runLocalEngine, DEFAULT_TRUCKS } from "@/engine/localEngine";
import { usePlanContext } from "@/lib/planContext";

const SAMPLE_POLYGON = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 150 }, { x: 0, y: 150 }];

export default function ExportTab() {
  const exportMutation = useExportPlan();
  const [exported, setExported] = useState(false);
  const { currentPlan, selectedTruck } = usePlanContext();

  const handleExport = async () => {
    const planToExport = currentPlan ?? runLocalEngine(SAMPLE_POLYGON, DEFAULT_TRUCKS[0], 5);
    const truck = selectedTruck ?? DEFAULT_TRUCKS[0];
    try {
      const result = await exportMutation.mutateAsync({
        data: {
          plan: {
            spots:          planToExport.spots as any,
            lanes:          planToExport.lanes as any,
            polygon:        planToExport.polygon,
            insetPolygon:   planToExport.insetPolygon,
            bestRotation:   planToExport.bestRotation,
            rotationScores: planToExport.rotationScores,
            metrics:        planToExport.metrics,
            truckProfile:   truck as any,
            entryPoint:     planToExport.entryPoint,
            exitPoint:      planToExport.exitPoint,
            generatedAt:    new Date().toISOString(),
          }
        }
      });
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = result.filename; a.click(); URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch {
      const blob = new Blob([JSON.stringify({ ...planToExport, truck }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "dump-plan.json"; a.click();
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    }
  };

  const hasPlan = currentPlan != null && currentPlan.metrics.spotCount > 0;

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full max-w-2xl">
      <div className="bg-card border border-border rounded p-5">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Export Dump Plan</div>
        <p className="text-sm text-muted-foreground mb-1">
          Export the current optimized plan as a structured JSON file compatible with fleet management systems.
        </p>
        {hasPlan && (
          <p className="text-xs font-mono text-green-400 mb-4">
            Current plan ready: {currentPlan!.metrics.spotCount} spots · {currentPlan!.lanes.length} lanes · {currentPlan!.bestRotation}° optimal rotation
            {currentPlan!.entryPoint ? " · entry/exit set" : ""}
          </p>
        )}
        {!hasPlan && (
          <p className="text-xs text-amber-400 mb-4">
            No plan in memory — will export a sample Rectangle plan. Run optimization in Planner first for your custom plan.
          </p>
        )}
        <button
          onClick={handleExport}
          disabled={exportMutation.isPending}
          className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded hover:opacity-90 transition-opacity disabled:opacity-40"
          data-testid="button-export-json"
        >
          {exportMutation.isPending ? "Exporting…" : exported ? "Downloaded ✓" : "Export Plan JSON"}
        </button>
        {exported && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-green-400">
            Plan downloaded successfully.
          </motion.div>
        )}
        <div className="mt-4 text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
          <div className="font-medium text-foreground mb-1">Export includes:</div>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>Truck profile (model, dimensions, payload, turning radius)</li>
            <li>Polygon vertices (outer boundary + turning-radius inset)</li>
            <li>All spot coordinates with lane ID, sequence, and rotation metadata</li>
            <li>Entry and exit points (if set in Planner)</li>
            <li>Rotation sweep scores (0–60°) and optimal angle</li>
            <li>Density metrics: hex vs square grid improvement</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
