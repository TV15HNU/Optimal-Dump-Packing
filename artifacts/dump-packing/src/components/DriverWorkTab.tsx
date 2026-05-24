import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useUser } from "@clerk/react";
import type { LocalPackResult } from "@/engine/localEngine";

interface SiteSummary {
  id: string; name: string; status: "running" | "completed";
  truck_name: string; total_spots: number; spots_done: number;
}
interface SiteDetail extends SiteSummary {
  plan: LocalPackResult;
  spotProgress: { spot_id: number; done: boolean; done_at?: string; driver_id?: string }[];
}

function SpotCanvas({ plan, spotProgress, width = 300, height = 170 }: {
  plan: LocalPackResult; spotProgress: { spot_id: number; done: boolean }[];
  width?: number; height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneSet = new Set(spotProgress.filter((s) => s.done).map((s) => s.spot_id));
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !plan?.polygon?.length) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0f1117"; ctx.fillRect(0, 0, width, height);
    const pts = plan.polygon;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 16;
    const sx = (width - pad * 2) / (maxX - minX || 1), sy = (height - pad * 2) / (maxY - minY || 1);
    const scale = Math.min(sx, sy);
    const offX = pad + (width - pad * 2 - (maxX - minX) * scale) / 2;
    const offY = pad + (height - pad * 2 - (maxY - minY) * scale) / 2;
    const tx = (x: number) => offX + (x - minX) * scale;
    const ty = (y: number) => offY + (y - minY) * scale;
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(tx(p.x), ty(p.y)) : ctx.lineTo(tx(p.x), ty(p.y)));
    ctx.closePath(); ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1.5; ctx.stroke();
    const r = Math.max(2.5, Math.min(5, scale * 2));
    for (const spot of (plan.spots ?? [])) {
      const isDone = doneSet.has(spot.id);
      ctx.beginPath(); ctx.arc(tx(spot.x), ty(spot.y), r, 0, Math.PI * 2);
      ctx.fillStyle = isDone ? "#22c55e" : "#ef4444"; ctx.fill();
    }
  }, [plan, doneSet, width, height]);
  return <canvas ref={canvasRef} className="rounded border border-border" style={{ width, height }} />;
}

export default function DriverWorkTab() {
  const { user } = useUser();
  const driverId = user?.id ?? "driver";
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [selectedSite, setSelectedSite] = useState<SiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [markingSpot, setMarkingSpot] = useState<number | null>(null);

  const fetchSites = useCallback(async () => {
    try {
      const all = (await api.sites.list()) as SiteSummary[];
      setSites(all.filter((s) => s.status === "running"));
    } catch { setSites([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSites(); }, [fetchSites]);
  useEffect(() => {
    const iv = setInterval(fetchSites, 15000);
    return () => clearInterval(iv);
  }, [fetchSites]);

  const openSite = useCallback(async (id: string) => {
    setDetailLoading(true);
    try { const data = await api.sites.get(id); setSelectedSite(data); }
    catch { setSelectedSite(null); } finally { setDetailLoading(false); }
  }, []);

  const toggleSpot = useCallback(async (spotId: number, currentlyDone: boolean) => {
    if (!selectedSite) return;
    setMarkingSpot(spotId);
    const newDone = !currentlyDone;
    try {
      await api.sites.updateProgress(selectedSite.id, spotId, newDone, driverId);
      setSelectedSite((prev) => {
        if (!prev) return prev;
        const newProg = prev.spotProgress.map((sp) =>
          sp.spot_id === spotId
            ? { ...sp, done: newDone, done_at: newDone ? new Date().toISOString() : undefined }
            : sp
        );
        const doneCount = newProg.filter((sp) => sp.done).length;
        return { ...prev, spotProgress: newProg, spots_done: doneCount };
      });
      setSites((prev) =>
        prev.map((s) => {
          if (s.id !== selectedSite.id) return s;
          const delta = newDone ? 1 : -1;
          return { ...s, spots_done: Math.max(0, s.spots_done + delta) };
        })
      );
    } catch { } finally { setMarkingSpot(null); }
  }, [selectedSite, driverId]);

  const spots = selectedSite?.plan?.spots ?? [];
  const spotProgress = selectedSite?.spotProgress ?? [];
  const doneSet = new Set(spotProgress.filter((s) => s.done).map((s) => s.spot_id));
  const pendingSpots = spots.filter((s) => !doneSet.has(s.id));
  const doneSpots = spots.filter((s) => doneSet.has(s.id));
  const pct = selectedSite && selectedSite.total_spots > 0
    ? Math.round((selectedSite.spots_done / selectedSite.total_spots) * 100) : 0;

  return (
    <div className="flex h-full gap-4 p-4 overflow-hidden">
      {/* Left: site list */}
      <div className="flex flex-col gap-3 w-64 shrink-0 overflow-y-auto">
        <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Assigned Sites</div>
        {loading ? (
          <div className="text-xs text-muted-foreground animate-pulse py-4 text-center">Loading…</div>
        ) : sites.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded p-4">
            No active sites.<br />Check with your supervisor.
          </div>
        ) : (
          sites.map((site) => {
            const sitePct = site.total_spots > 0 ? Math.round((site.spots_done / site.total_spots) * 100) : 0;
            return (
              <motion.div key={site.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => openSite(site.id)}
                className={`bg-card border rounded p-3 cursor-pointer hover:border-cyan-500/50 transition-colors ${
                  selectedSite?.id === site.id ? "border-cyan-500/60 bg-cyan-500/5" : "border-border"
                }`}>
                <div className="text-xs font-semibold mb-1 truncate">{site.name}</div>
                <div className="text-[11px] text-muted-foreground font-mono mb-2">{site.truck_name}</div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-1">
                  <motion.div className={`h-full rounded-full ${sitePct === 100 ? "bg-green-500" : "bg-cyan-500"}`}
                    initial={{ width: 0 }} animate={{ width: `${sitePct}%` }} transition={{ duration: 0.5 }} />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>{site.spots_done}/{site.total_spots}</span>
                  <span className={sitePct === 100 ? "text-green-400" : "text-cyan-400"}>{sitePct}%</span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Right: detail + spot list */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!selectedSite && !detailLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a site to see your work
          </div>
        )}
        {detailLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm animate-pulse">Loading…</div>
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
                    <div className="text-sm font-bold">{selectedSite.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{selectedSite.truck_name}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-500/15 text-amber-400">Running</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-muted-foreground">{selectedSite.spots_done} / {selectedSite.total_spots} spots</span>
                  <span className={pct === 100 ? "text-green-400" : "text-cyan-400"}>{pct}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : "bg-cyan-500"}`}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
                </div>
              </div>

              {/* Canvas */}
              <div className="bg-card border border-border rounded p-4">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Site Map</div>
                <SpotCanvas plan={selectedSite.plan} spotProgress={selectedSite.spotProgress ?? []} />
                <div className="mt-2 flex gap-5 text-[11px]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Done ({doneSpots.length})</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Pending ({pendingSpots.length})</span>
                </div>
              </div>

              {/* Pending */}
              {pendingSpots.length > 0 && (
                <div className="bg-card border border-border rounded p-4">
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                    Pending ({pendingSpots.length})
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                    {pendingSpots.map((spot) => (
                      <button key={spot.id} onClick={() => toggleSpot(spot.id, false)}
                        disabled={markingSpot === spot.id}
                        className="flex items-center gap-2 p-2 bg-secondary border border-border rounded text-xs hover:border-green-500/60 hover:bg-green-500/5 transition-colors disabled:opacity-50 text-left">
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-mono font-semibold">#{spot.globalSequence + 1}</div>
                          <div className="text-muted-foreground text-[10px]">Lane {spot.laneId < 0 ? "gap" : spot.laneId}</div>
                        </div>
                        <span className={`text-[10px] shrink-0 ${markingSpot === spot.id ? "text-amber-400" : "text-green-400"}`}>
                          {markingSpot === spot.id ? "…" : "✓"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Done */}
              {doneSpots.length > 0 && (
                <div className="bg-card border border-border rounded p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Completed ({doneSpots.length})
                  </div>
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {doneSpots.map((spot) => {
                      const prog = spotProgress.find((sp) => sp.spot_id === spot.id);
                      return (
                        <div key={spot.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/40">
                          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                          <span className="font-mono text-green-400">#{spot.globalSequence + 1}</span>
                          <span className="text-[10px] text-muted-foreground">Lane {spot.laneId < 0 ? "gap" : spot.laneId}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {prog?.done_at ? new Date(prog.done_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                          <button onClick={() => toggleSpot(spot.id, true)} disabled={markingSpot === spot.id}
                            className="text-[10px] text-muted-foreground hover:text-amber-400 shrink-0 transition-colors">
                            undo
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pct === 100 && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-500/10 border border-green-500/30 rounded p-4 text-center">
                  <div className="text-green-400 font-bold text-sm">All spots filled!</div>
                  <div className="text-[11px] text-muted-foreground mt-1">This site is 100% complete. Great work!</div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
