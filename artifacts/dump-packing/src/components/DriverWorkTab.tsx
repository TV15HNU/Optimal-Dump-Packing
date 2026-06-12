import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useUser } from "@clerk/react";
import { sortSpotsByDispatch } from "@/engine/localEngine";
import type { LocalPackResult } from "@/engine/localEngine";

const R_EARTH = 6371000;

function getGpsOrigin(poly: { lat: number; lng: number }[]) {
  const lat0 = (poly.reduce((s, p) => s + p.lat, 0) / poly.length) * Math.PI / 180;
  const lng0 = (poly.reduce((s, p) => s + p.lng, 0) / poly.length) * Math.PI / 180;
  return { lat0, lng0 };
}

function localToGps(pt: { x: number; y: number }, o: { lat0: number; lng0: number }) {
  return {
    lat: (o.lat0 + pt.y / R_EARTH) * 180 / Math.PI,
    lng: (o.lng0 + pt.x / (R_EARTH * Math.cos(o.lat0))) * 180 / Math.PI,
  };
}

interface SiteSummary {
  id: string; name: string; status: "running" | "completed";
  truck_name: string; total_spots: number; spots_done: number;
}
interface SiteDetail extends SiteSummary {
  plan: LocalPackResult;
  gps_polygon: { lat: number; lng: number }[] | null;
  spotProgress: { spot_id: number; done: boolean; done_at?: string; driver_id?: string }[];
}

function SpotCanvas({ plan, spotProgress, currentSpotId, blink, width = 340, height = 190 }: {
  plan: LocalPackResult;
  spotProgress: { spot_id: number; done: boolean }[];
  currentSpotId?: number;
  blink?: boolean;
  width?: number;
  height?: number;
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
    const pad = 18;
    const sx = (width - pad * 2) / (maxX - minX || 1);
    const sy = (height - pad * 2) / (maxY - minY || 1);
    const scale = Math.min(sx, sy);
    const offX = pad + (width - pad * 2 - (maxX - minX) * scale) / 2;
    const offY = pad + (height - pad * 2 - (maxY - minY) * scale) / 2;
    const tx = (x: number) => offX + (x - minX) * scale;
    const ty = (y: number) => offY + (y - minY) * scale;

    // Polygon
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(tx(p.x), ty(p.y)) : ctx.lineTo(tx(p.x), ty(p.y)));
    ctx.closePath(); ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1.5; ctx.stroke();

    const r = Math.max(2.5, Math.min(5, scale * 2));
    for (const spot of (plan.spots ?? [])) {
      const isDone = doneSet.has(spot.id);
      const isCurrent = spot.id === currentSpotId;
      const cx = tx(spot.x), cy = ty(spot.y);

      if (isCurrent) {
        // Blinking glow ring
        if (!blink) {
          const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 4);
          glow.addColorStop(0, "rgba(251,191,36,0.5)");
          glow.addColorStop(1, "rgba(251,191,36,0)");
          ctx.beginPath(); ctx.arc(cx, cy, r * 4, 0, Math.PI * 2);
          ctx.fillStyle = glow; ctx.fill();
          ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
          ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
        ctx.fillStyle = blink ? "#fbbf24" : "#f59e0b"; ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = isDone ? "#22c55e" : "#ef4444"; ctx.fill();
      }
    }

    // Entry / exit
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
  }, [plan, doneSet, currentSpotId, blink, width, height]);

  return <canvas ref={canvasRef} className="rounded border border-border w-full" style={{ width, height }} />;
}

export default function DriverWorkTab() {
  const { user } = useUser();
  const driverId = user?.id ?? "driver";
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [selectedSite, setSelectedSite] = useState<SiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [blink, setBlink] = useState(true);

  // Blinking ticker for current spot
  useEffect(() => {
    const iv = setInterval(() => setBlink((b) => !b), 550);
    return () => clearInterval(iv);
  }, []);

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

  const markDone = useCallback(async () => {
    if (!selectedSite || marking) return;
    const spots = selectedSite.plan?.spots ?? [];
    const doneSet = new Set(selectedSite.spotProgress.filter((s) => s.done).map((s) => s.spot_id));
    const currentSpot = spots.find((s) => !doneSet.has(s.id));
    if (!currentSpot) return;

    setMarking(true);
    try {
      await api.sites.updateProgress(selectedSite.id, currentSpot.id, true, driverId);
      setSelectedSite((prev) => {
        if (!prev) return prev;
        const newProg = [
          ...prev.spotProgress.filter((sp) => sp.spot_id !== currentSpot.id),
          { spot_id: currentSpot.id, done: true, done_at: new Date().toISOString(), driver_id: driverId },
        ];
        const doneCount = newProg.filter((sp) => sp.done).length;
        return { ...prev, spotProgress: newProg, spots_done: doneCount };
      });
      setSites((prev) => prev.map((s) =>
        s.id === selectedSite.id ? { ...s, spots_done: Math.min(s.spots_done + 1, s.total_spots) } : s
      ));
    } catch { } finally { setMarking(false); }
  }, [selectedSite, driverId, marking]);

  const undoSpot = useCallback(async (spotId: number) => {
    if (!selectedSite) return;
    try {
      await api.sites.updateProgress(selectedSite.id, spotId, false, driverId);
      setSelectedSite((prev) => {
        if (!prev) return prev;
        const newProg = prev.spotProgress.map((sp) =>
          sp.spot_id === spotId ? { ...sp, done: false, done_at: undefined } : sp
        );
        return { ...prev, spotProgress: newProg, spots_done: newProg.filter((sp) => sp.done).length };
      });
    } catch { }
  }, [selectedSite, driverId]);

  // Derived data
  const rawSpots = selectedSite?.plan?.spots ?? [];
  const spotProgress = selectedSite?.spotProgress ?? [];
  const doneSet = new Set(spotProgress.filter((s) => s.done).map((s) => s.spot_id));

  // Sort spots farthest-from-entry first (matches SimulationTab dispatch order).
  // When no entry point is set, fall back to globalSequence order.
  const spots = useMemo(() => {
    const entryPt = selectedSite?.plan?.entryPoint ?? null;
    if (entryPt) return sortSpotsByDispatch(rawSpots, entryPt);
    return [...rawSpots].sort((a, b) => a.globalSequence - b.globalSequence);
  }, [rawSpots, selectedSite?.plan?.entryPoint]);

  const pendingSpots = spots.filter((s) => !doneSet.has(s.id));
  const doneSpots = spots.filter((s) => doneSet.has(s.id));
  const currentSpot = pendingSpots[0] ?? null;
  const pct = selectedSite && selectedSite.total_spots > 0
    ? Math.round((selectedSite.spots_done / selectedSite.total_spots) * 100) : 0;

  // GPS conversion for current spot
  const gpsOrigin = selectedSite?.gps_polygon?.length
    ? getGpsOrigin(selectedSite.gps_polygon) : null;
  const currentGps = currentSpot && gpsOrigin
    ? localToGps({ x: currentSpot.x, y: currentSpot.y }, gpsOrigin) : null;

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

      {/* Right: work detail */}
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
                    <div className="text-[11px] text-muted-foreground font-mono">{selectedSite.truck_name}</div>
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

              {/* Map */}
              <div className="bg-card border border-border rounded p-4">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Site Map</div>
                <SpotCanvas
                  plan={selectedSite.plan}
                  spotProgress={selectedSite.spotProgress ?? []}
                  currentSpotId={currentSpot?.id}
                  blink={blink}
                />
                <div className="mt-2 flex gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Current
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Done ({doneSpots.length})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Pending ({Math.max(0, pendingSpots.length - 1)})
                  </span>
                </div>
              </div>

              {/* Current task */}
              <AnimatePresence mode="wait">
                {currentSpot ? (
                  <motion.div key={currentSpot.id}
                    initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                    className="bg-card border border-amber-500/40 rounded p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <motion.span
                        animate={{ opacity: blink ? 0.4 : 1 }}
                        transition={{ duration: 0.55 }}
                        className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                      <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                        Current Task — Spot #{currentSpot.globalSequence + 1}
                      </div>
                      <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                        {pendingSpots.length} remaining
                      </span>
                    </div>

                    {/* Spot details */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-secondary/40 rounded p-2.5">
                        <div className="text-[10px] text-muted-foreground uppercase mb-1">Lane</div>
                        <div className="font-mono font-bold text-sm">
                          {currentSpot.laneId < 0 ? "Gap fill" : `Lane ${currentSpot.laneId}`}
                        </div>
                      </div>
                      <div className="bg-secondary/40 rounded p-2.5">
                        <div className="text-[10px] text-muted-foreground uppercase mb-1">Sequence</div>
                        <div className="font-mono font-bold text-sm">#{currentSpot.globalSequence + 1}</div>
                      </div>
                      <div className="bg-secondary/40 rounded p-2.5">
                        <div className="text-[10px] text-muted-foreground uppercase mb-1">Latitude</div>
                        <div className={`font-mono font-bold text-sm ${currentGps ? "text-cyan-400" : "text-muted-foreground"}`}>
                          {currentGps ? `${currentGps.lat.toFixed(6)}°` : "N/A"}
                        </div>
                      </div>
                      <div className="bg-secondary/40 rounded p-2.5">
                        <div className="text-[10px] text-muted-foreground uppercase mb-1">Longitude</div>
                        <div className={`font-mono font-bold text-sm ${currentGps ? "text-cyan-400" : "text-muted-foreground"}`}>
                          {currentGps ? `${currentGps.lng.toFixed(6)}°` : "N/A"}
                        </div>
                      </div>
                    </div>
                    {!gpsOrigin && (
                      <div className="text-[10px] text-amber-400/70 bg-amber-500/5 border border-amber-500/20 rounded px-2.5 py-1.5 mb-4">
                        GPS polygon not recorded for this site — coordinates unavailable.
                        Contact your supervisor to re-import with GPS vertices.
                      </div>
                    )}

                    <button
                      onClick={markDone}
                      disabled={marking}
                      className="w-full py-3 bg-green-500/15 border border-green-500/40 text-green-400 font-bold text-sm rounded hover:bg-green-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {marking ? (
                        <><span className="animate-pulse">Marking…</span></>
                      ) : (
                        <><span className="text-lg leading-none">✓</span> Mark Done</>
                      )}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="complete"
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-green-500/10 border border-green-500/30 rounded p-5 text-center">
                    <div className="text-green-400 font-bold text-base mb-1">All spots filled!</div>
                    <div className="text-[11px] text-muted-foreground">This site is 100% complete. Great work!</div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Completed spots log */}
              {doneSpots.length > 0 && (
                <div className="bg-card border border-border rounded p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Completed ({doneSpots.length})
                  </div>
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {[...doneSpots].reverse().map((spot) => {
                      const prog = spotProgress.find((sp) => sp.spot_id === spot.id);
                      const spotGps = gpsOrigin ? localToGps({ x: spot.x, y: spot.y }, gpsOrigin) : null;
                      return (
                        <div key={spot.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/40">
                          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                          <span className="font-mono text-green-400 shrink-0">#{spot.globalSequence + 1}</span>
                          {spotGps && (
                            <span className="text-[10px] text-muted-foreground font-mono truncate">
                              {spotGps.lat.toFixed(5)}°, {spotGps.lng.toFixed(5)}°
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                            {prog?.done_at ? new Date(prog.done_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                          <button onClick={() => undoSpot(spot.id)}
                            className="text-[10px] text-muted-foreground hover:text-amber-400 shrink-0 transition-colors">
                            undo
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
