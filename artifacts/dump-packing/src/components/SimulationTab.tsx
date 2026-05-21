import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { runLocalEngine, DEFAULT_TRUCKS, type LocalPackResult, type Pt } from "@/engine/localEngine";
import PackingCanvas from "./PackingCanvas";

const DEFAULT_POLY: Pt[] = [
  { x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 150 }, { x: 0, y: 150 }
];

export default function SimulationTab() {
  const [plan, setPlan] = useState<LocalPackResult>(() =>
    runLocalEngine(DEFAULT_POLY, DEFAULT_TRUCKS[0], 5)
  );
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [activeId, setActiveId] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [selectedTruckIdx, setSelectedTruckIdx] = useState(0);

  const PRESET_POLYS = [
    { name: "Rectangle 200×150m", poly: DEFAULT_POLY },
    { name: "L-Shape Terrace", poly: [{ x: 0, y: 0 }, { x: 180, y: 0 }, { x: 180, y: 80 }, { x: 100, y: 80 }, { x: 100, y: 160 }, { x: 0, y: 160 }] },
    { name: "Trapezoidal Bench", poly: [{ x: 30, y: 0 }, { x: 220, y: 0 }, { x: 250, y: 120 }, { x: 0, y: 120 }] },
    { name: "Pentagon Zone", poly: [{ x: 100, y: 0 }, { x: 220, y: 60 }, { x: 190, y: 180 }, { x: 50, y: 190 }, { x: 0, y: 80 }] },
  ];

  const sortedSpots = [...plan.spots].sort((a, b) => a.globalSequence - b.globalSequence);
  const totalSpots = sortedSpots.length;
  const progressPct = totalSpots > 0 ? Math.round((completedIds.size / totalSpots) * 100) : 0;

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setPlaying(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setCompletedIds(new Set());
    setActiveId(null);
    setCurrentStep(0);
  }, [stop]);

  const start = useCallback(() => {
    if (currentStep >= totalSpots) reset();
    setPlaying(true);
    let step = currentStep;
    intervalRef.current = setInterval(() => {
      if (step >= totalSpots) { stop(); return; }
      const spot = sortedSpots[step];
      setActiveId(spot.id);
      setTimeout(() => {
        setCompletedIds((prev) => new Set([...prev, spot.id]));
        setActiveId(null);
      }, Math.max(100, 600 / speed));
      step++;
      setCurrentStep(step);
    }, Math.max(150, 800 / speed));
  }, [currentStep, totalSpots, sortedSpots, speed, stop, reset]);

  useEffect(() => { return () => stop(); }, [stop]);

  const loadPreset = useCallback((idx: number) => {
    stop(); setSelectedPreset(idx);
    const poly = PRESET_POLYS[idx].poly;
    const truck = DEFAULT_TRUCKS[selectedTruckIdx];
    setPlan(runLocalEngine(poly, truck, 5));
    setCompletedIds(new Set()); setActiveId(null); setCurrentStep(0);
  }, [selectedTruckIdx, stop]);

  const loadTruck = useCallback((idx: number) => {
    stop(); setSelectedTruckIdx(idx);
    const poly = PRESET_POLYS[selectedPreset].poly;
    const truck = DEFAULT_TRUCKS[idx];
    setPlan(runLocalEngine(poly, truck, 5));
    setCompletedIds(new Set()); setActiveId(null); setCurrentStep(0);
  }, [selectedPreset, stop]);

  const laneProgress = plan.lanes.map((l) => ({
    id: l.id,
    total: l.spotIds.length,
    done: l.spotIds.filter((id) => completedIds.has(id)).length,
  }));

  return (
    <div className="flex h-full gap-4 p-4 overflow-hidden">
      {/* Controls */}
      <div className="flex flex-col gap-3 w-64 shrink-0 overflow-y-auto">
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Scenario</div>
          {PRESET_POLYS.map((p, i) => (
            <button key={i} onClick={() => loadPreset(i)}
              className={`block w-full text-left text-xs px-2 py-1.5 rounded border mb-1 ${selectedPreset === i ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:bg-muted"}`}
              data-testid={`sim-preset-${i}`}
            >{p.name}</button>
          ))}
        </div>
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Truck</div>
          {DEFAULT_TRUCKS.map((t, i) => (
            <button key={t.id} onClick={() => loadTruck(i)}
              className={`block w-full text-left text-xs px-2 py-1.5 rounded border mb-1 ${selectedTruckIdx === i ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:bg-muted"}`}
              data-testid={`sim-truck-${t.id}`}
            >{t.name}</button>
          ))}
        </div>
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Playback</div>
          <div className="flex gap-2 mb-3">
            {playing
              ? <button onClick={stop} className="flex-1 py-1.5 text-xs bg-secondary border border-border rounded hover:bg-muted" data-testid="button-pause">Pause</button>
              : <button onClick={start} disabled={totalSpots === 0} className="flex-1 py-1.5 text-xs bg-primary text-primary-foreground rounded disabled:opacity-40 font-semibold" data-testid="button-play">
                  {currentStep >= totalSpots && currentStep > 0 ? "Replay" : "Play"}
                </button>
            }
            <button onClick={reset} className="py-1.5 px-3 text-xs bg-secondary border border-border rounded hover:bg-muted" data-testid="button-reset">Reset</button>
          </div>
          <div className="text-xs text-muted-foreground mb-1">Speed</div>
          <div className="flex gap-1 mb-3">
            {[1, 2, 4].map((s) => (
              <button key={s} onClick={() => setSpeed(s)}
                className={`flex-1 py-1 text-xs rounded border ${speed === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}
                data-testid={`speed-${s}x`}
              >{s}x</button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mb-1">Progress</div>
          <div className="h-2 bg-secondary rounded overflow-hidden mb-1">
            <motion.div
              className="h-full bg-primary rounded"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>{completedIds.size}/{totalSpots} spots</span>
            <span>{progressPct}%</span>
          </div>
        </div>
        <div className="bg-card border border-border rounded p-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Lane Progress</div>
          {laneProgress.map((l) => (
            <div key={l.id} className="mb-1.5">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-muted-foreground">Lane {l.id}</span>
                <span className="font-mono text-foreground">{l.done}/{l.total}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded overflow-hidden">
                <div className="h-full bg-green-500 rounded" style={{ width: l.total > 0 ? `${(l.done / l.total) * 100}%` : "0%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>{plan.spots.length} spots — {plan.lanes.length} lanes — {DEFAULT_TRUCKS[selectedTruckIdx].name}</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>Dumped</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-white inline-block"></span>Active</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 inline-block"></span>Pending</span>
          </div>
        </div>
        <div className="flex-1 bg-[#0b0e15] border border-border rounded overflow-hidden">
          <PackingCanvas
            polygon={plan.polygon}
            insetPolygon={plan.insetPolygon}
            spots={plan.spots}
            lanes={plan.lanes}
            completedSpotIds={completedIds}
            activeSpotId={activeId}
            readOnly
          />
        </div>
        {plan.spots.length > 0 && (
          <div className="h-8 flex items-center gap-3 px-2 bg-card border border-border rounded text-xs text-muted-foreground font-mono">
            <span>Remaining: <span className="text-foreground">{totalSpots - completedIds.size}</span></span>
            <span>|</span>
            <span>Best rotation: <span className="text-primary">{plan.bestRotation}°</span></span>
            <span>|</span>
            <span>Improvement: <span className="text-green-400">+{plan.metrics.improvementPercent.toFixed(1)}%</span></span>
            <span>|</span>
            <span>Utilization: <span className="text-foreground">{(plan.metrics.utilizationEfficiency * 100).toFixed(1)}%</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
