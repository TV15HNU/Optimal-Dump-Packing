import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExportPlan } from "@workspace/api-client-react";
import { runLocalEngine, DEFAULT_TRUCKS } from "@/engine/localEngine";
import { usePlanContext } from "@/lib/planContext";
import { api } from "@/lib/api";

const SAMPLE_POLYGON = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 150 }, { x: 0, y: 150 }];

export default function ExportImportTab() {
  const exportMutation = useExportPlan();
  const [exported, setExported] = useState(false);
  const [mapExported, setMapExported] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const [siteName, setSiteName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    currentPlan, selectedTruck,
    mapPlan, mapGpsPts,
    setMapPlan, setMapGpsPts, setMapEntryPoint, setMapExitPoint,
  } = usePlanContext();

  const hasPlannerPlan = currentPlan != null && currentPlan.metrics.spotCount > 0;
  const hasMapPlan = mapPlan != null && mapPlan.metrics.spotCount > 0;

  const handleExportPlanner = async () => {
    const planToExport = currentPlan ?? runLocalEngine(SAMPLE_POLYGON, DEFAULT_TRUCKS[0], 5);
    const truck = selectedTruck ?? DEFAULT_TRUCKS[0];
    try {
      const result = await exportMutation.mutateAsync({
        data: {
          plan: {
            spots: planToExport.spots as any,
            lanes: planToExport.lanes as any,
            polygon: planToExport.polygon,
            insetPolygon: planToExport.insetPolygon,
            bestRotation: planToExport.bestRotation,
            rotationScores: planToExport.rotationScores,
            metrics: planToExport.metrics,
            truckProfile: truck as any,
            generatedAt: new Date().toISOString(),
          } as any,
        },
      });
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = result.filename; a.click(); URL.revokeObjectURL(url);
    } catch {
      const blob = new Blob([JSON.stringify({ ...planToExport, truck }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "dump-plan.json"; a.click();
      URL.revokeObjectURL(url);
    }
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const handleExportMap = () => {
    if (!mapPlan) return;
    const payload = { gpsPolygon: mapGpsPts, plan: mapPlan };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "map-gps-plan.json"; a.click();
    URL.revokeObjectURL(url);
    setMapExported(true);
    setTimeout(() => setMapExported(false), 3000);
  };

  const [importedPlan, setImportedPlan] = useState<any>(null);
  const [importedGps, setImportedGps] = useState<any[]>([]);
  const [importSiteName, setImportSiteName] = useState("");
  const [importSaveMsg, setImportSaveMsg] = useState("");
  const [importSaving, setImportSaving] = useState(false);

  const handleImport = useCallback((file: File) => {
    setImportError(""); setImportSuccess(""); setImportedPlan(null); setImportedGps([]);
    const suggestedName = file.name.replace(/\.(json)$/i, "").replace(/[-_]/g, " ");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target!.result as string);
        if (!Array.isArray(data.gpsPolygon) || !Array.isArray(data.plan?.spots)) {
          setImportError("Invalid plan: needs gpsPolygon and plan.spots arrays"); return;
        }
        setMapPlan(data.plan);
        setMapGpsPts(data.gpsPolygon);
        if (data.plan.entryPoint) setMapEntryPoint(data.plan.entryPoint);
        if (data.plan.exitPoint) setMapExitPoint(data.plan.exitPoint);
        setImportedPlan(data.plan);
        setImportedGps(data.gpsPolygon);
        setImportSiteName(suggestedName);
        setImportSuccess(`Imported ${data.plan.spots.length} spots into Map/GPS tab ✓`);
      } catch {
        setImportError("Failed to parse — ensure it is a valid plan JSON");
      }
    };
    reader.readAsText(file);
  }, [setMapPlan, setMapGpsPts, setMapEntryPoint, setMapExitPoint]);

  const handleSaveImportedSite = async () => {
    if (!importedPlan || !importSiteName.trim()) { setImportSaveMsg("Enter a site name"); return; }
    setImportSaving(true); setImportSaveMsg("");
    try {
      await api.sites.save({
        id: `site-${Date.now()}`,
        name: importSiteName.trim(),
        truckId: selectedTruck?.id ?? "",
        truckName: selectedTruck?.name ?? "",
        polygon: importedPlan.polygon,
        gpsPolygon: importedGps,
        plan: importedPlan,
      });
      setImportSaveMsg(`"${importSiteName.trim()}" added to Dashboard ✓`);
      setImportedPlan(null);
      setTimeout(() => setImportSaveMsg(""), 4000);
    } catch (err: any) {
      setImportSaveMsg(`Error: ${err.message}`);
    } finally {
      setImportSaving(false);
    }
  };

  const handleSaveSite = async (source: "planner" | "map") => {
    const plan = source === "planner" ? currentPlan : mapPlan;
    if (!plan) return;
    if (!siteName.trim()) { setSaveMsg("Enter a site name first"); return; }
    setSaving(true); setSaveMsg("");
    try {
      const id = `site-${Date.now()}`;
      await api.sites.save({
        id,
        name: siteName.trim(),
        truckId: selectedTruck?.id ?? "",
        truckName: selectedTruck?.name ?? "",
        polygon: plan.polygon,
        gpsPolygon: source === "map" ? mapGpsPts : null,
        plan,
      });
      setSaveMsg(`Site "${siteName.trim()}" saved to Dashboard ✓`);
      setSiteName("");
      setTimeout(() => setSaveMsg(""), 4000);
    } catch (err: any) {
      setSaveMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full max-w-2xl">

      {/* Save to Dashboard */}
      <div className="bg-card border border-primary/30 rounded p-5">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Save Site to Dashboard</div>
        <p className="text-xs text-muted-foreground mb-3">
          Save the current plan as a named site. Supervisors can track progress in the Dashboard tab.
        </p>
        <input
          type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)}
          placeholder="Site name (e.g. Pit A – Bench 3)"
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary outline-none mb-2"
        />
        <div className="flex gap-2">
          <button
            onClick={() => handleSaveSite("planner")}
            disabled={saving || !hasPlannerPlan}
            className="flex-1 py-2 text-xs bg-primary text-primary-foreground rounded font-semibold disabled:opacity-40 hover:opacity-90">
            {saving ? "Saving…" : "Save Planner Plan"}
          </button>
          <button
            onClick={() => handleSaveSite("map")}
            disabled={saving || !hasMapPlan}
            className="flex-1 py-2 text-xs bg-secondary border border-border rounded font-semibold disabled:opacity-40 hover:bg-muted">
            {saving ? "Saving…" : "Save Map/GPS Plan"}
          </button>
        </div>
        <AnimatePresence>
          {saveMsg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={`mt-2 text-xs px-2 py-1.5 rounded ${saveMsg.startsWith("Error") ? "text-red-400 bg-red-950/30 border border-red-900" : "text-green-400"}`}>
              {saveMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Export Planner */}
      <div className="bg-card border border-border rounded p-5">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Export — Planner</div>
        {hasPlannerPlan ? (
          <p className="text-xs font-mono text-green-400 mb-3">
            {currentPlan!.metrics.spotCount} spots · {currentPlan!.lanes.length} lanes · {currentPlan!.bestRotation}° optimal
            {currentPlan!.entryPoint ? " · entry/exit set" : ""}
          </p>
        ) : (
          <p className="text-xs text-amber-400 mb-3">No planner plan — will export sample Rectangle plan.</p>
        )}
        <button
          onClick={handleExportPlanner}
          disabled={exportMutation.isPending}
          className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded hover:opacity-90 disabled:opacity-40">
          {exportMutation.isPending ? "Exporting…" : exported ? "Downloaded ✓" : "Export Planner JSON"}
        </button>
      </div>

      {/* Export Map/GPS */}
      <div className="bg-card border border-border rounded p-5">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Export — Map / GPS</div>
        {hasMapPlan ? (
          <p className="text-xs font-mono text-green-400 mb-3">
            {mapPlan!.metrics.spotCount} spots · {mapGpsPts.length} GPS polygon pts · {mapPlan!.bestRotation}° optimal
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mb-3">No Map/GPS plan yet — run Generate Plan in the Map/GPS tab first.</p>
        )}
        <button
          onClick={handleExportMap}
          disabled={!hasMapPlan}
          className="px-5 py-2 bg-secondary border border-border text-sm font-semibold rounded hover:bg-muted disabled:opacity-40">
          {mapExported ? "Downloaded ✓" : "Export Map/GPS JSON"}
        </button>
      </div>

      {/* Import Plan JSON */}
      <div className="bg-card border border-border rounded p-5">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Import Plan JSON</div>
        <p className="text-xs text-muted-foreground mb-3">
          Load a previously exported Map/GPS plan JSON — it will be imported into the Map/GPS tab.
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-5 py-2 bg-secondary border border-border text-sm font-semibold rounded hover:bg-muted">
          ↑ Choose File…
        </button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }} />
        <AnimatePresence>
          {importError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-2 text-xs text-red-400 bg-red-950/30 border border-red-900 rounded px-2 py-1.5">
              {importError}
            </motion.div>
          )}
          {importSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-2 text-xs text-green-400">
              {importSuccess}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save imported plan to Dashboard */}
        <AnimatePresence>
          {importedPlan && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 border-t border-border pt-4">
              <div className="text-xs font-semibold text-amber-400 mb-2">↗ Save to Dashboard</div>
              <p className="text-xs text-muted-foreground mb-2">
                {importedPlan.spots.length} spots loaded — give this site a name to track progress in the Dashboard.
              </p>
              <input
                type="text" value={importSiteName} onChange={(e) => setImportSiteName(e.target.value)}
                placeholder="Site name…"
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary outline-none mb-2"
              />
              <button
                onClick={handleSaveImportedSite}
                disabled={importSaving || !importSiteName.trim()}
                className="w-full py-2 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/40 rounded font-semibold disabled:opacity-40 hover:bg-amber-500/20">
                {importSaving ? "Saving…" : "Save as Site →"}
              </button>
              {importSaveMsg && (
                <div className={`mt-1.5 text-xs ${importSaveMsg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
                  {importSaveMsg}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* What's included */}
      <div className="bg-card border border-border rounded p-5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Export includes</div>
        <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
          <li>Truck profile (model, dimensions, payload, turning radius)</li>
          <li>Polygon vertices (outer boundary + turning-radius inset)</li>
          <li>All spot coordinates with lane ID, sequence, and rotation</li>
          <li>Entry and exit points (if set)</li>
          <li>GPS polygon coordinates (Map/GPS export only)</li>
          <li>Rotation sweep scores and optimal angle</li>
          <li>Density metrics: hex vs square grid improvement</li>
        </ul>
      </div>
    </div>
  );
}
