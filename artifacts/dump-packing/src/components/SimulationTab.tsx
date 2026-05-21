import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { runLocalEngine, DEFAULT_TRUCKS, type LocalPackResult, type Pt, type TruckConfig } from "@/engine/localEngine";
import PackingCanvas from "./PackingCanvas";
import { usePlanContext } from "@/lib/planContext";

const DEFAULT_POLY: Pt[] = [
  { x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 150 }, { x: 0, y: 150 }
];

const PRESET_POLYS: { name: string; poly: Pt[] }[] = [
  { name: "Rectangle 200×150m", poly: DEFAULT_POLY },
  { name: "L-Shape Terrace",    poly: [{x:0,y:0},{x:180,y:0},{x:180,y:80},{x:100,y:80},{x:100,y:160},{x:0,y:160}] },
  { name: "Trapezoidal Bench",  poly: [{x:30,y:0},{x:220,y:0},{x:250,y:120},{x:0,y:120}] },
  { name: "Pentagon Zone",      poly: [{x:100,y:0},{x:220,y:60},{x:190,y:180},{x:50,y:190},{x:0,y:80}] },
];

const BLANK_CUSTOM: Omit<TruckConfig, "id"> = {
  name: "", width: 9, length: 14, turningRadius: 12, spacingX: 13.5, spacingY: 13.5, payloadTonnes: 200,
};

export default function SimulationTab() {
  const { currentPlan, currentPolygon, customTrucks, addCustomTruck, removeCustomTruck } = usePlanContext();

  const [useDrawnPlan, setUseDrawnPlan] = useState(false);
  const [plan, setPlan]       = useState<LocalPackResult>(() => runLocalEngine(DEFAULT_POLY, DEFAULT_TRUCKS[0], 5));
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [activeId, setActiveId]         = useState<number | null>(null);
  const [playing, setPlaying]           = useState(false);
  const [speed, setSpeed]               = useState(1);
  const [currentStep, setCurrentStep]   = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [selectedTruckId, setSelectedTruckId] = useState(DEFAULT_TRUCKS[0].id);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Custom truck form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm]         = useState({ ...BLANK_CUSTOM });
  const [customError, setCustomError]       = useState("");

  const allTrucks: TruckConfig[] = [...DEFAULT_TRUCKS, ...customTrucks];

  // When a plan exists from Planner and user switches to it
  useEffect(() => {
    if (useDrawnPlan && currentPlan) {
      setPlan(currentPlan);
      setCompletedIds(new Set()); setActiveId(null); setCurrentStep(0);
    }
  }, [useDrawnPlan, currentPlan]);

  const sortedSpots  = [...plan.spots].sort((a, b) => a.globalSequence - b.globalSequence);
  const totalSpots   = sortedSpots.length;
  const progressPct  = totalSpots > 0 ? Math.round((completedIds.size / totalSpots) * 100) : 0;

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (activeTimeoutRef.current) { clearTimeout(activeTimeoutRef.current); activeTimeoutRef.current = null; }
    setPlaying(false); setActiveId(null);
  }, []);

  const reset = useCallback(() => {
    stop(); setCompletedIds(new Set()); setActiveId(null); setCurrentStep(0);
  }, [stop]);

  const start = useCallback(() => {
    if (currentStep >= totalSpots) { reset(); return; }
    setPlaying(true);
    let step = currentStep;
    intervalRef.current = setInterval(() => {
      if (step >= totalSpots) { stop(); return; }
      const spot = sortedSpots[step];
      setActiveId(spot.id);
      activeTimeoutRef.current = setTimeout(() => {
        setCompletedIds((prev) => new Set([...prev, spot.id]));
        setActiveId(null);
      }, Math.max(80, 500 / speed));
      step++; setCurrentStep(step);
    }, Math.max(120, 700 / speed));
  }, [currentStep, totalSpots, sortedSpots, speed, stop, reset]);

  useEffect(() => () => stop(), [stop]);

  const loadPreset = useCallback((idx: number) => {
    stop(); setSelectedPreset(idx); setUseDrawnPlan(false);
    const truck = allTrucks.find((t) => t.id === selectedTruckId) ?? DEFAULT_TRUCKS[0];
    setPlan(runLocalEngine(PRESET_POLYS[idx].poly, truck, 5));
    setCompletedIds(new Set()); setActiveId(null); setCurrentStep(0);
  }, [selectedTruckId, allTrucks, stop]);

  const loadTruck = useCallback((id: string) => {
    stop(); setSelectedTruckId(id);
    const truck = allTrucks.find((t) => t.id === id) ?? DEFAULT_TRUCKS[0];
    if (useDrawnPlan && currentPlan) { setPlan(runLocalEngine(currentPlan.polygon, truck, 5)); }
    else { setPlan(runLocalEngine(PRESET_POLYS[selectedPreset].poly, truck, 5)); }
    setCompletedIds(new Set()); setActiveId(null); setCurrentStep(0);
  }, [selectedPreset, useDrawnPlan, currentPlan, allTrucks, stop]);

  const handleUseDrawnPlan = useCallback(() => {
    if (!currentPlan) return;
    setUseDrawnPlan(true);
    setPlan(currentPlan);
    setCompletedIds(new Set()); setActiveId(null); setCurrentStep(0); stop();
  }, [currentPlan, stop]);

  const handleAddCustomTruck = useCallback(() => {
    if (!customForm.name.trim()) { setCustomError("Name is required"); return; }
    if (customForm.width <= 0 || customForm.length <= 0 || customForm.turningRadius <= 0) {
      setCustomError("Width, Length and Turning Radius must be > 0"); return;
    }
    const id = `custom-${customForm.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    addCustomTruck({ id, ...customForm });
    setSelectedTruckId(id);
    setCustomError(""); setShowCustomForm(false); setCustomForm({ ...BLANK_CUSTOM });
  }, [customForm, addCustomTruck]);

  const allDone     = completedIds.size === totalSpots && totalSpots > 0;
  const noneStarted = completedIds.size === 0 && activeId === null;
  const laneProgress = plan.lanes.map((l) => ({
    id: l.id, total: l.spotIds.length, done: l.spotIds.filter((id) => completedIds.has(id)).length,
  }));

  return (
    <div className="flex h-full gap-4 p-4 overflow-hidden">

      {/* ── Controls ── */}
      <div className="flex flex-col gap-3 w-64 shrink-0 overflow-y-auto">

        {/* Source toggle */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Polygon Source</div>
          {currentPlan ? (
            <div className="flex gap-1 mb-1">
              <button onClick={handleUseDrawnPlan}
                className={`flex-1 py-1.5 text-xs rounded border ${useDrawnPlan ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}>
                From Planner
              </button>
              <button onClick={() => { setUseDrawnPlan(false); loadPreset(selectedPreset); }}
                className={`flex-1 py-1.5 text-xs rounded border ${!useDrawnPlan ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}>
                Presets
              </button>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic mb-1">Run a plan in Planner first to use your drawn shape</div>
          )}
          {!useDrawnPlan && PRESET_POLYS.map((p, i) => (
            <button key={i} onClick={() => loadPreset(i)}
              className={`block w-full text-left text-xs px-2 py-1.5 rounded border mb-1 ${
                selectedPreset === i ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:bg-muted"
              }`}>{p.name}</button>
          ))}
          {useDrawnPlan && currentPlan && (
            <div className="text-xs font-mono text-green-400 mt-1">
              Using Planner result — {currentPlan.spots.length} spots, {currentPlan.bestRotation}°
            </div>
          )}
        </div>

        {/* Truck */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Truck</div>
          <div className="flex flex-col gap-1 mb-2">
            {allTrucks.map((t) => (
              <div key={t.id} className="flex items-center gap-1">
                <button onClick={() => loadTruck(t.id)}
                  className={`flex-1 text-left text-xs px-2 py-1.5 rounded border ${
                    selectedTruckId === t.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:bg-muted"
                  }`}>{t.name}</button>
                {t.id.startsWith("custom-") && (
                  <button onClick={() => removeCustomTruck(t.id)} className="text-xs text-muted-foreground hover:text-red-400 px-1">✕</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => { setShowCustomForm((v) => !v); setCustomError(""); }}
            className="w-full text-xs py-1.5 border border-dashed border-border rounded hover:border-primary hover:text-primary text-muted-foreground transition-colors">
            {showCustomForm ? "Cancel" : "+ Custom Truck"}
          </button>
        </div>

        {/* Custom truck form */}
        <AnimatePresence>
          {showCustomForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-card border border-primary/30 rounded p-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Custom Truck</div>
              <div className="flex flex-col gap-1.5 text-xs">
                {([
                  ["name", "Truck Name", "text"],
                  ["width", "Body Width (m)", "number"],
                  ["length", "Body Length (m)", "number"],
                  ["turningRadius", "Turning Radius (m)", "number"],
                  ["spacingX", "Spacing X (m)", "number"],
                  ["spacingY", "Spacing Y (m)", "number"],
                  ["payloadTonnes", "Payload (t)", "number"],
                ] as [keyof typeof customForm, string, string][]).map(([field, label, type]) => (
                  <div key={field}>
                    <label className="text-muted-foreground block mb-0.5">{label}</label>
                    <input type={type} value={(customForm as any)[field]}
                      onChange={(e) => setCustomForm((p) => ({ ...p, [field]: type === "number" ? Number(e.target.value) : e.target.value }))}
                      className="w-full bg-secondary border border-border rounded px-2 py-1 font-mono text-foreground focus:border-primary outline-none" />
                  </div>
                ))}
                {customError && <div className="text-red-400 text-[11px]">{customError}</div>}
                <button onClick={handleAddCustomTruck}
                  className="w-full py-1.5 bg-primary text-primary-foreground rounded font-semibold hover:opacity-90 mt-1">
                  Add & Select
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Playback */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Playback</div>
          <div className="flex gap-2 mb-3">
            {playing
              ? <button onClick={stop} className="flex-1 py-1.5 text-xs bg-secondary border border-border rounded">Pause</button>
              : <button onClick={start} disabled={totalSpots === 0}
                  className="flex-1 py-1.5 text-xs bg-primary text-primary-foreground rounded disabled:opacity-40 font-semibold">
                  {allDone ? "Replay" : "Play"}
                </button>}
            <button onClick={reset} className="py-1.5 px-3 text-xs bg-secondary border border-border rounded">Reset</button>
          </div>

          <div className="text-xs text-muted-foreground mb-1">Speed</div>
          <div className="flex gap-1 mb-3">
            {[1, 2, 4].map((s) => (
              <button key={s} onClick={() => setSpeed(s)}
                className={`flex-1 py-1 text-xs rounded border ${speed === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}>
                {s}×
              </button>
            ))}
          </div>

          <div className="text-xs text-muted-foreground mb-1">Progress</div>
          <div className="h-2 bg-secondary rounded overflow-hidden mb-1">
            <motion.div className="h-full bg-green-500 rounded" animate={{ width: `${progressPct}%` }} transition={{ duration: 0.25 }} />
          </div>
          <div className="flex justify-between text-xs font-mono text-muted-foreground">
            <span>{completedIds.size}/{totalSpots} dumped</span>
            <span>{progressPct}%</span>
          </div>
        </div>

        {/* Lane progress */}
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Lane Progress</div>
          {laneProgress.map((l) => (
            <div key={l.id} className="mb-1.5">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-muted-foreground">Lane {l.id}</span>
                <span className="font-mono">{l.done}/{l.total}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded overflow-hidden">
                <div className="h-full bg-green-500 rounded transition-all"
                  style={{ width: l.total > 0 ? `${(l.done / l.total) * 100}%` : "0%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>
            {plan.spots.length} spots · {plan.lanes.length} lanes ·{" "}
            {allTrucks.find((t) => t.id === selectedTruckId)?.name ?? ""}
            {useDrawnPlan ? " · From Planner" : ""}
          </span>
          <div className="flex gap-3 items-center">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Pending</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-white inline-block" />Active</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Dumped</span>
          </div>
        </div>

        <div className="flex-1 bg-[#0b0e15] border border-border rounded overflow-hidden">
          <PackingCanvas
            polygon={plan.polygon}
            insetPolygon={plan.insetPolygon}
            spots={plan.spots}
            lanes={plan.lanes}
            isClosed
            completedSpotIds={completedIds}
            activeSpotId={activeId}
            simulationMode
            readOnly
          />
        </div>

        <div className="h-8 flex items-center gap-4 px-3 bg-card border border-border rounded text-xs font-mono text-muted-foreground shrink-0">
          <span>Remaining: <span className="text-foreground">{totalSpots - completedIds.size}</span></span>
          <span>|</span>
          <span>Optimal angle: <span className="text-primary">{plan.bestRotation}°</span></span>
          <span>|</span>
          <span>Improvement: <span className="text-green-400">+{plan.metrics.improvementPercent.toFixed(1)}%</span></span>
          <span>|</span>
          <span>Status: <span className={allDone ? "text-green-400" : playing ? "text-amber-400" : noneStarted ? "text-red-400" : "text-foreground"}>
            {allDone ? "Complete" : playing ? "Dispatching…" : noneStarted ? "Ready" : "Paused"}
          </span></span>
        </div>
      </div>
    </div>
  );
}
