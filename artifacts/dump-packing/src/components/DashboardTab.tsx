import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { LocalPackResult } from "@/engine/localEngine";
import type { SpotLocal } from "@/engine/localEngine";

function pickNextFarthestFirst(spots: SpotLocal[], doneIds: Set<number>, entryPt: { x: number; y: number } | null): SpotLocal | null {
  const pending = spots.filter((s) => !doneIds.has(s.id));
  if (pending.length === 0) return null;
  if (!entryPt) return [...pending].sort((a, b) => a.globalSequence - b.globalSequence)[0];
  return pending.reduce((best, s) => {
    const dBest = Math.hypot(best.x - entryPt.x, best.y - entryPt.y);
    const dS    = Math.hypot(s.x   - entryPt.x, s.y   - entryPt.y);
    return dS > dBest ? s : best;
  });
}

interface SiteSummary {
  id: string;
  name: string;
  status: "running" | "completed";
  truck_name: string;
  total_spots: number;
  spots_done: number;
  created_at: string;
  updated_at: string;
}

interface SiteDetail extends SiteSummary {
  plan: LocalPackResult;
  polygon: any[];
  spotProgress: { spot_id: number; done: boolean; done_at?: string }[];
  progressHistory: { spots_done: number; total_spots: number; snapshot_at: string }[];
}

// ─── High-resolution packing canvas (matches Planner quality) ───────────────
function SiteCanvas({ plan, spotProgress, width = 540, height = 300 }: {
  plan: LocalPackResult;
  spotProgress: { spot_id: number; done: boolean }[];
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneSet = new Set(spotProgress.filter((s) => s.done).map((s) => s.spot_id));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !plan?.polygon?.length) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const W = width, H = height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f1117";
    ctx.fillRect(0, 0, W, H);

    const pts = plan.polygon;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
    const pad = 24;
    const sx = (W - pad * 2) / rangeX, sy = (H - pad * 2) / rangeY;
    const scale = Math.min(sx, sy);
    const offX = pad + (W - pad * 2 - rangeX * scale) / 2;
    const offY = pad + (H - pad * 2 - rangeY * scale) / 2;
    const tx = (x: number) => offX + (x - minX) * scale;
    const ty = (y: number) => offY + (y - minY) * scale;

    // Inset polygon (turning radius buffer)
    if (plan.insetPolygon?.length) {
      ctx.beginPath();
      plan.insetPolygon.forEach((p, i) =>
        i === 0 ? ctx.moveTo(tx(p.x), ty(p.y)) : ctx.lineTo(tx(p.x), ty(p.y))
      );
      ctx.closePath();
      ctx.fillStyle = "rgba(26,31,46,0.6)";
      ctx.fill();
    }

    // Outer polygon
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(tx(p.x), ty(p.y)) : ctx.lineTo(tx(p.x), ty(p.y)));
    ctx.closePath();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Grid lines (subtle)
    ctx.strokeStyle = "rgba(71,85,105,0.15)";
    ctx.lineWidth = 0.5;
    for (let gx = minX; gx <= maxX; gx += 10) {
      ctx.beginPath(); ctx.moveTo(tx(gx), ty(minY)); ctx.lineTo(tx(gx), ty(maxY)); ctx.stroke();
    }
    for (let gy = minY; gy <= maxY; gy += 10) {
      ctx.beginPath(); ctx.moveTo(tx(minX), ty(gy)); ctx.lineTo(tx(maxX), ty(gy)); ctx.stroke();
    }

    // Spots
    const spots = plan.spots ?? [];
    const r = Math.max(3, Math.min(7, scale * 2.5));
    for (const spot of spots) {
      const isDone = doneSet.has(spot.id);
      const cx = tx(spot.x), cy = ty(spot.y);

      // Glow
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5);
      if (isDone) {
        gradient.addColorStop(0, "rgba(34,197,94,0.35)");
        gradient.addColorStop(1, "rgba(34,197,94,0)");
      } else {
        gradient.addColorStop(0, "rgba(239,68,68,0.25)");
        gradient.addColorStop(1, "rgba(239,68,68,0)");
      }
      ctx.beginPath(); ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = gradient; ctx.fill();

      // Core dot
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = isDone ? "#22c55e" : "#ef4444";
      ctx.fill();
      ctx.strokeStyle = isDone ? "rgba(134,239,172,0.6)" : "rgba(252,165,165,0.4)";
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }

    // Entry / Exit markers
    const drawMarker = (pt: { x: number; y: number }, label: string, color: string) => {
      const cx = tx(pt.x), cy = ty(pt.y);
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "bold 8px Inter"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, cx, cy);
    };
    if (plan.entryPoint) drawMarker(plan.entryPoint, "E", "#3b82f6");
    if (plan.exitPoint) drawMarker(plan.exitPoint, "X", "#8b5cf6");

  }, [plan, doneSet, width, height]);

  return <canvas ref={canvasRef} className="rounded border border-border w-full" style={{ width, height }} />;
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] font-mono mb-1">
        <span className="text-muted-foreground">{done} / {total} spots</span>
        <span className={pct === 100 ? "text-green-400" : "text-primary"}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : "bg-primary"}`}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

function HistorySparkline({ history }: { history: { spots_done: number; total_spots: number; snapshot_at: string }[] }) {
  if (history.length < 2) return <div className="text-[11px] text-muted-foreground">No history yet — demo mode will populate this.</div>;

  const W = 300, H = 50;
  const max = Math.max(...history.map((h) => h.total_spots), 1);
  const pts = history.map((h, i) => ({
    x: (i / (history.length - 1)) * W,
    y: H - (h.spots_done / max) * H * 0.9,
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${d} L${W},${H} L0,${H} Z`;

  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-1 font-mono">Progress history</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spark-fill)" />
        <path d={d} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
        {pts.filter((_, i) => i % Math.max(1, Math.floor(pts.length / 8)) === 0 || i === pts.length - 1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#f59e0b" />
        ))}
      </svg>
    </div>
  );
}

// ─── Daily Report Modal ──────────────────────────────────────────────────────
function DailyReportModal({ sites, onClose }: { sites: SiteSummary[]; onClose: () => void }) {
  const today = new Date().toDateString();
  const totalSpots = sites.reduce((a, s) => a + s.total_spots, 0);
  const totalDone = sites.reduce((a, s) => a + s.spots_done, 0);
  const runningCount = sites.filter((s) => s.status === "running").length;
  const completedToday = sites.filter((s) =>
    s.status === "completed" && new Date(s.updated_at).toDateString() === today
  ).length;

  // Estimate truck trips: 1 trip per spot (each spot = 1 truck dump)
  const truckTrips = totalDone;
  const tripsPerSite = runningCount > 0 ? Math.round(totalDone / Math.max(runningCount, 1)) : 0;
  const completionRate = totalSpots > 0 ? Math.round((totalDone / totalSpots) * 100) : 0;
  const efficiency = completionRate > 75 ? "High" : completionRate > 40 ? "Moderate" : "Low";
  const effColor = completionRate > 75 ? "text-green-400" : completionRate > 40 ? "text-amber-400" : "text-red-400";

  const stats = [
    { label: "Spots Filled Today", value: totalDone, sub: "across all active sites", color: "text-primary" },
    { label: "Truck Trips (Est.)", value: truckTrips, sub: `≈ ${tripsPerSite} trips/site avg`, color: "text-cyan-400" },
    { label: "Sites Active", value: runningCount, sub: `${completedToday} completed today`, color: "text-amber-400" },
    { label: "Remaining Spots", value: totalSpots - totalDone, sub: `${completionRate}% overall complete`, color: "text-red-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 10 }}
        className="bg-card border border-border rounded w-full max-w-md"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="text-sm font-bold">Daily Operations Report</div>
            <div className="text-[11px] text-muted-foreground font-mono">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 p-5">
          {stats.map((s) => (
            <div key={s.label} className="bg-secondary/50 border border-border rounded p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</div>
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Efficiency badge */}
        <div className="px-5 pb-4">
          <div className="bg-secondary/30 border border-border rounded p-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Overall site efficiency</div>
            <div className={`text-sm font-bold ${effColor}`}>{efficiency} ({completionRate}%)</div>
          </div>
        </div>

        {/* Site breakdown */}
        {sites.length > 0 && (
          <div className="px-5 pb-5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Per-Site Breakdown</div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {sites.map((s) => {
                const pct = s.total_spots > 0 ? Math.round((s.spots_done / s.total_spots) * 100) : 0;
                return (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.status === "completed" ? "bg-green-500" : "bg-amber-400"}`} />
                    <span className="flex-1 truncate font-mono">{s.name}</span>
                    <span className="text-muted-foreground shrink-0">{s.spots_done}/{s.total_spots}</span>
                    <span className={`shrink-0 ${pct === 100 ? "text-green-400" : "text-primary"}`}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 text-xs border border-border rounded hover:bg-muted font-semibold">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardTab() {
  const { toast } = useToast();
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<SiteDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "running" | "completed">("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [demoActive, setDemoActive] = useState(false);
  const [demoMsg, setDemoMsg] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const demoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSitesDoneRef = useRef<Record<string, number>>({});

  const fetchSites = useCallback(async () => {
    try {
      const data = await api.sites.list();
      setSites(data);
    } catch {
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  // Reload sites list every 10s; fire toast when any site reaches 100%
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const data = await api.sites.list();
        setSites(data);
        for (const site of data) {
          const prev = prevSitesDoneRef.current[site.id] ?? -1;
          if (
            site.total_spots > 0 &&
            site.spots_done >= site.total_spots &&
            prev < site.total_spots
          ) {
            toast({
              title: "Site Complete! 🎉",
              description: `${site.name} — all ${site.total_spots} spots filled.`,
              duration: 6000,
            });
          }
          prevSitesDoneRef.current[site.id] = site.spots_done;
        }
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(iv);
  }, [fetchSites, toast]);

  const openDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await api.sites.get(id);
      setSelectedSite(data);
    } catch {
      setSelectedSite(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const markStatus = useCallback(async (id: string, status: "running" | "completed") => {
    // Optimistic update: immediately reflect new status in BOTH selectedSite AND sites list
    // (sites list drives the top-left Running/Completed/Spots Done counters)
    setSites((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      if (status === "running") return { ...s, status: "running", spots_done: 0 };
      return { ...s, status };
    }));
    if (selectedSite?.id === id) {
      setSelectedSite((prev) => {
        if (!prev) return prev;
        if (status === "running") return { ...prev, status: "running", spots_done: 0, spotProgress: [] };
        return { ...prev, status };
      });
    }
    await api.sites.updateStatus(id, status);
    fetchSites();
    if (selectedSite?.id === id) openDetail(id);
  }, [fetchSites, openDetail, selectedSite]);

  const deleteSite = useCallback(async (id: string) => {
    await api.sites.delete(id);
    setConfirmDelete(null);
    if (selectedSite?.id === id) setSelectedSite(null);
    fetchSites();
  }, [fetchSites, selectedSite]);

  // ── Demo mode: fill one spot per second, farthest-first ──
  const startDemo = useCallback(() => {
    if (!selectedSite) { setDemoMsg("Select a site first"); return; }
    setDemoActive(true);
    setDemoMsg("Demo running…");

    demoRef.current = setInterval(async () => {
      setSelectedSite((prev) => {
        if (!prev) return prev;
        const allSpots = prev.plan.spots ?? [];
        const doneIds = new Set(prev.spotProgress.filter((sp) => sp.done).map((sp) => sp.spot_id));
        const entryPt = (prev.plan.entryPoint as { x: number; y: number } | null | undefined) ?? null;
        const next = pickNextFarthestFirst(allSpots, doneIds, entryPt);
        if (!next) {
          clearInterval(demoRef.current!); demoRef.current = null;
          setDemoActive(false); setDemoMsg("All spots filled ✓");
          const siteId = prev.id, siteName = prev.name, total = prev.total_spots;
          setTimeout(() => {
            toast({ title: "Site Complete! 🎉", description: `${siteName} — all ${total} spots filled.`, duration: 6000 });
            api.sites.updateStatus(siteId, "completed").catch(() => {});
            fetchSites();
          }, 200);
          return { ...prev, status: "completed", spots_done: prev.total_spots };
        }
        api.sites.updateProgress(prev.id, next.id, true, "demo-driver").catch(() => {});
        const newProgress = [
          ...prev.spotProgress.filter((sp) => sp.spot_id !== next.id),
          { spot_id: next.id, done: true, done_at: new Date().toISOString() },
        ];
        const newDone = newProgress.filter((sp) => sp.done).length;
        return { ...prev, spots_done: newDone, spotProgress: newProgress,
          progressHistory: [...prev.progressHistory, { spots_done: newDone, total_spots: prev.total_spots, snapshot_at: new Date().toISOString() }],
        };
      });
    }, 1000);
  }, [selectedSite, fetchSites, toast]);

  const stopDemo = useCallback(() => {
    if (demoRef.current) { clearInterval(demoRef.current); demoRef.current = null; }
    setDemoActive(false); setDemoMsg("");
    if (selectedSite) openDetail(selectedSite.id);
  }, [selectedSite, openDetail]);

  useEffect(() => () => { if (demoRef.current) clearInterval(demoRef.current); }, []);

  // Auto-refresh selected site detail every 10s so driver progress shows up without manual click
  const selectedSiteIdRef = useRef<string | null>(null);
  useEffect(() => { selectedSiteIdRef.current = selectedSite?.id ?? null; }, [selectedSite?.id]);
  useEffect(() => {
    const iv = setInterval(async () => {
      const id = selectedSiteIdRef.current;
      if (!id || demoActive) return;
      try {
        const fresh = await api.sites.get(id);
        setSelectedSite(fresh);
        // Mirror spots_done into the summary list so the left sidebar stays in sync
        setSites((prev) => prev.map((s) => s.id === id ? { ...s, spots_done: fresh.spots_done, status: fresh.status } : s));
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(iv);
  }, [demoActive]);

  const filtered = sites.filter((s) => filter === "all" || s.status === filter);
  const running = sites.filter((s) => s.status === "running").length;
  const completed = sites.filter((s) => s.status === "completed").length;
  const totalSpots = sites.reduce((a, s) => a + s.total_spots, 0);
  const totalDone = sites.reduce((a, s) => a + s.spots_done, 0);

  return (
    <div className="flex h-full gap-4 p-4 overflow-hidden relative">

      {/* ── Left: site list ── */}
      <div className="flex flex-col gap-3 w-72 shrink-0 overflow-y-auto">

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Running",    value: running,    color: "text-amber-400" },
            { label: "Completed",  value: completed,  color: "text-green-400" },
            { label: "Total Spots", value: totalSpots, color: "text-primary" },
            { label: "Spots Done", value: totalDone,  color: "text-cyan-400" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
              <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-1">
          {(["all", "running", "completed"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 text-xs py-1.5 rounded border capitalize ${
                filter === f ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:bg-muted text-muted-foreground"
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Sites list */}
        {loading ? (
          <div className="text-xs text-muted-foreground text-center py-8 animate-pulse">Loading sites…</div>
        ) : filtered.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded p-4">
            No sites found.<br />Save a plan from Planner or Map/GPS to create a site.
          </div>
        ) : (
          filtered.map((site) => (
            <motion.div
              key={site.id}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => openDetail(site.id)}
              className={`bg-card border rounded p-3 cursor-pointer transition-colors hover:border-primary/50 ${
                selectedSite?.id === site.id ? "border-primary/60 bg-primary/5" : "border-border"
              }`}>
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{site.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{site.truck_name}</div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ml-2 shrink-0 ${
                  site.status === "completed" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"
                }`}>
                  {site.status}
                </span>
              </div>
              <ProgressBar done={site.spots_done} total={site.total_spots} />
            </motion.div>
          ))
        )}
      </div>

      {/* ── Right: site detail ── */}
      <div className="flex-1 min-w-0 overflow-y-auto pb-4">
        {!selectedSite && !detailLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a site to view details
          </div>
        )}
        {detailLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm animate-pulse">
            Loading…
          </div>
        )}
        <AnimatePresence mode="wait">
          {selectedSite && !detailLoading && (
            <motion.div key={selectedSite.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-4">

              {/* Header */}
              <div className="bg-card border border-border rounded p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-base font-bold">{selectedSite.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {selectedSite.truck_name} · {selectedSite.total_spots} spots total
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Created {new Date(selectedSite.created_at).toLocaleDateString()} ·
                      Updated {new Date(selectedSite.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      selectedSite.status === "completed" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"
                    }`}>
                      {selectedSite.status}
                    </span>
                    {selectedSite.status === "running" ? (
                      <button onClick={() => markStatus(selectedSite.id, "completed")}
                        className="text-[11px] px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded hover:bg-green-500/20">
                        Mark Complete
                      </button>
                    ) : (
                      <button onClick={() => markStatus(selectedSite.id, "running")}
                        className="text-[11px] px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded hover:bg-amber-500/20">
                        Reopen
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (selectedSite.status !== "running") await markStatus(selectedSite.id, "running");
                        toast({ title: "Assigned to Drivers", description: `${selectedSite.name} is now visible in the Driver Work tab.`, duration: 4000 });
                      }}
                      className="text-[11px] px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/20">
                      Assign to Driver
                    </button>
                    <button onClick={() => setConfirmDelete(selectedSite.id)}
                      className="text-[11px] px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded hover:bg-red-500/20">
                      Delete
                    </button>
                  </div>
                </div>
                <ProgressBar done={selectedSite.spots_done} total={selectedSite.total_spots} />
              </div>

              {/* Demo controls */}
              <div className="bg-card border border-border rounded p-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5">Simulation Demo</div>
                  <div className="text-[11px] text-muted-foreground">
                    {demoActive
                      ? "Filling one spot every second — watch canvas & sparkline update in real time"
                      : "Auto-fill spots every second to demonstrate live progress tracking"}
                  </div>
                  {demoMsg && <div className={`text-[11px] mt-1 ${demoMsg.includes("✓") ? "text-green-400" : demoMsg.includes("Select") ? "text-amber-400" : "text-cyan-400"}`}>{demoMsg}</div>}
                </div>
                {demoActive ? (
                  <button onClick={stopDemo}
                    className="shrink-0 px-3 py-2 text-xs bg-red-500/10 text-red-400 border border-red-500/30 rounded font-semibold hover:bg-red-500/20">
                    Stop
                  </button>
                ) : (
                  <button onClick={startDemo}
                    className="shrink-0 px-3 py-2 text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded font-semibold hover:bg-cyan-500/20">
                    ▶ Start Demo
                  </button>
                )}
              </div>

              {/* Site canvas (high-res) */}
              <div className="bg-card border border-border rounded p-4">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Site Map</div>
                <div className="text-[11px] text-muted-foreground mb-3 flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                    Done ({selectedSite.spots_done})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                    Pending ({selectedSite.total_spots - selectedSite.spots_done})
                  </span>
                  {selectedSite.plan.entryPoint && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Entry/Exit
                    </span>
                  )}
                </div>
                <SiteCanvas
                  plan={selectedSite.plan}
                  spotProgress={selectedSite.spotProgress ?? []}
                />
              </div>

              {/* Progress history */}
              <div className="bg-card border border-border rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider">Progress Timeline</div>
                  <div className="flex gap-1">
                    <button onClick={() => setShowHistory(false)}
                      className={`px-2 py-0.5 text-[10px] rounded font-semibold transition-colors ${!showHistory ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                      Chart
                    </button>
                    <button onClick={() => setShowHistory(true)}
                      className={`px-2 py-0.5 text-[10px] rounded font-semibold transition-colors ${showHistory ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                      History
                    </button>
                  </div>
                </div>
                {!showHistory ? (
                  <HistorySparkline history={selectedSite.progressHistory ?? []} />
                ) : (
                  <div className="max-h-52 overflow-y-auto">
                    {(selectedSite.progressHistory ?? []).length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-6">No history yet — start demo or fill spots</div>
                    ) : (
                      <div className="text-[11px] font-mono text-muted-foreground space-y-0.5">
                        {[...(selectedSite.progressHistory ?? [])].reverse().map((h, i) => (
                          <div key={i} className="flex justify-between items-center border-b border-border/50 py-1">
                            <span className="text-muted-foreground/70">
                              {new Date(h.snapshot_at).toLocaleDateString([], { month: "2-digit", day: "2-digit" })}
                              {" "}
                              {new Date(h.snapshot_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                            <span className="text-primary font-semibold">{h.spots_done}/{h.total_spots} spots</span>
                            <span className={`font-bold ${h.total_spots > 0 && Math.round((h.spots_done / h.total_spots) * 100) === 100 ? "text-green-400" : "text-amber-400"}`}>
                              {h.total_spots > 0 ? Math.round((h.spots_done / h.total_spots) * 100) : 0}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Spot breakdown */}
              <div className="bg-card border border-border rounded p-4">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Spot Breakdown</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-secondary rounded p-2">
                    <div className="text-muted-foreground">Total</div>
                    <div className="font-mono font-bold text-foreground">{selectedSite.total_spots}</div>
                  </div>
                  <div className="bg-secondary rounded p-2">
                    <div className="text-muted-foreground">Done</div>
                    <div className="font-mono font-bold text-green-400">{selectedSite.spots_done}</div>
                  </div>
                  <div className="bg-secondary rounded p-2">
                    <div className="text-muted-foreground">Remaining</div>
                    <div className="font-mono font-bold text-red-400">{selectedSite.total_spots - selectedSite.spots_done}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom-left: Daily Report button ── */}
      <div className="absolute bottom-5 left-5">
        <button onClick={() => setShowReport(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded text-xs font-semibold hover:border-primary/50 hover:bg-primary/5 transition-colors shadow-lg">
          <span className="text-primary">📋</span>
          Daily Report
        </button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showReport && <DailyReportModal sites={sites} onClose={() => setShowReport(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setConfirmDelete(null)}>
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded p-5 w-80"
              onClick={(e) => e.stopPropagation()}>
              <div className="text-sm font-semibold mb-2">Delete site?</div>
              <div className="text-xs text-muted-foreground mb-4">
                This will permanently remove the site and all its progress history.
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2 text-xs border border-border rounded hover:bg-muted">Cancel</button>
                <button onClick={() => deleteSite(confirmDelete)}
                  className="flex-1 py-2 text-xs bg-red-500/20 text-red-400 border border-red-500/40 rounded hover:bg-red-500/30">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
