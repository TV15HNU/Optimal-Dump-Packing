import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import type { LocalPackResult, SpotLocal } from "@/engine/localEngine";

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
  spotProgress: { spot_id: number; done: boolean }[];
  progressHistory: { spots_done: number; total_spots: number; snapshot_at: string }[];
}

function MiniCanvas({ plan, spotProgress }: { plan: LocalPackResult; spotProgress: { spot_id: number; done: boolean }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneSet = new Set(spotProgress.filter((s) => s.done).map((s) => s.spot_id));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !plan?.polygon?.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const pts = plan.polygon;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
    const pad = 12;
    const sx = (W - pad * 2) / rangeX, sy = (H - pad * 2) / rangeY;
    const scale = Math.min(sx, sy);
    const offX = pad + (W - pad * 2 - rangeX * scale) / 2;
    const offY = pad + (H - pad * 2 - rangeY * scale) / 2;
    const tx = (x: number) => offX + (x - minX) * scale;
    const ty = (y: number) => offY + (y - minY) * scale;

    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(tx(p.x), ty(p.y)) : ctx.lineTo(tx(p.x), ty(p.y)));
    ctx.closePath();
    ctx.fillStyle = "rgba(30,36,50,0.8)";
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.stroke();

    const r = Math.max(2, Math.min(5, scale * 3));
    for (const spot of (plan.spots ?? [])) {
      const isDone = doneSet.has(spot.id);
      ctx.beginPath();
      ctx.arc(tx(spot.x), ty(spot.y), r, 0, Math.PI * 2);
      ctx.fillStyle = isDone ? "#22c55e" : "#ef4444";
      ctx.fill();
    }
  }, [plan, doneSet]);

  return <canvas ref={canvasRef} width={200} height={130} className="rounded border border-border w-full" />;
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
  if (history.length < 2) return <div className="text-[11px] text-muted-foreground">No history yet</div>;

  const W = 200, H = 40;
  const max = history[history.length - 1]?.total_spots || 1;
  const pts = history.map((h, i) => ({
    x: (i / (history.length - 1)) * W,
    y: H - (h.spots_done / max) * H,
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-1 font-mono">Progress history</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <path d={d} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="#f59e0b" />
        ))}
      </svg>
    </div>
  );
}

export default function DashboardTab() {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<SiteDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "running" | "completed">("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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

  const filtered = sites.filter((s) => filter === "all" || s.status === filter);
  const running = sites.filter((s) => s.status === "running").length;
  const completed = sites.filter((s) => s.status === "completed").length;
  const totalSpots = sites.reduce((a, s) => a + s.total_spots, 0);
  const totalDone = sites.reduce((a, s) => a + s.spots_done, 0);

  return (
    <div className="flex h-full gap-4 p-4 overflow-hidden">

      {/* ── Left: site list ── */}
      <div className="flex flex-col gap-3 w-80 shrink-0 overflow-y-auto">

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Running", value: running, color: "text-amber-400" },
            { label: "Completed", value: completed, color: "text-green-400" },
            { label: "Total Spots", value: totalSpots, color: "text-primary" },
            { label: "Spots Done", value: totalDone, color: "text-cyan-400" },
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
          <div className="text-xs text-muted-foreground text-center py-8">Loading sites…</div>
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
      <div className="flex-1 min-w-0 overflow-y-auto">
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
                    <div className="text-xs text-muted-foreground font-mono">{selectedSite.truck_name} · {selectedSite.total_spots} spots total</div>
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
                    <button onClick={() => setConfirmDelete(selectedSite.id)}
                      className="text-[11px] px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded hover:bg-red-500/20">
                      Delete
                    </button>
                  </div>
                </div>
                <ProgressBar done={selectedSite.spots_done} total={selectedSite.total_spots} />
              </div>

              {/* Canvas snapshot */}
              <div className="bg-card border border-border rounded p-4">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Site Map</div>
                <div className="text-[11px] text-muted-foreground mb-2">
                  <span className="inline-flex items-center gap-1 mr-3">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Done
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Pending
                  </span>
                </div>
                <MiniCanvas plan={selectedSite.plan} spotProgress={selectedSite.spotProgress ?? []} />
              </div>

              {/* Progress history */}
              <div className="bg-card border border-border rounded p-4">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Progress Timeline</div>
                <HistorySparkline history={selectedSite.progressHistory ?? []} />
                {(selectedSite.progressHistory ?? []).length > 0 && (
                  <div className="mt-2 text-[11px] font-mono text-muted-foreground">
                    {selectedSite.progressHistory.slice(-3).reverse().map((h, i) => (
                      <div key={i} className="flex justify-between border-t border-border pt-1 mt-1">
                        <span>{new Date(h.snapshot_at).toLocaleTimeString()}</span>
                        <span className="text-primary">{h.spots_done}/{h.total_spots} spots</span>
                      </div>
                    ))}
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

      {/* Confirm delete */}
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
              <div className="text-xs text-muted-foreground mb-4">This will permanently remove the site and all its progress history.</div>
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
