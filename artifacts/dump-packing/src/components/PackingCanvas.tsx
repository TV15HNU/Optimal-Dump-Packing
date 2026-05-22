import { useRef, useEffect, useCallback } from "react";
import type { Pt, SpotLocal, LaneLocal } from "@/engine/localEngine";

const LANE_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#a855f7",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

interface Props {
  polygon: Pt[];
  insetPolygon: Pt[];
  spots: SpotLocal[];
  lanes: LaneLocal[];
  isClosed?: boolean;
  entryPoint?: Pt | null;
  exitPoint?: Pt | null;
  completedSpotIds?: Set<number>;
  activeSpotId?: number | null;
  onCanvasClick?: (localX: number, localY: number) => void;
  onSpotClick?: (spot: SpotLocal) => void;
  readOnly?: boolean;
  simulationMode?: boolean;
  sweepAngle?: number | null;
}

function computeTransform(polyPts: Pt[], width: number, height: number, pad = 56) {
  if (polyPts.length < 3) return { scale: 1, offsetX: 0, offsetY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polyPts) {
    if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
  }
  const dx = maxX - minX || 1, dy = maxY - minY || 1;
  const scale = Math.min((width - pad * 2) / dx, (height - pad * 2) / dy);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return { scale, offsetX: width / 2 - cx * scale, offsetY: height / 2 - cy * scale };
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  label: string,
  fill: string,
  border: string,
) {
  const r = 11;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = border; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 9px Inter, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, x, y);
  // outer pulse ring
  ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2);
  ctx.strokeStyle = fill + "55"; ctx.lineWidth = 2; ctx.stroke();
}

export default function PackingCanvas({
  polygon, insetPolygon, spots, lanes,
  isClosed = false,
  entryPoint = null, exitPoint = null,
  completedSpotIds, activeSpotId,
  onCanvasClick, onSpotClick,
  readOnly = false,
  simulationMode = false,
  sweepAngle = null,
}: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const hoveredRef   = useRef<number | null>(null);
  const transformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // dot grid
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    for (let x = 20; x < W; x += 32) for (let y = 20; y < H; y += 32) {
      ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
    }

    if (polygon.length === 0 && spots.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.font = "14px Inter, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Click to add polygon vertices", W / 2, H / 2 - 12);
      ctx.fillStyle = "rgba(255,255,255,0.09)";
      ctx.font = "12px Inter, sans-serif";
      ctx.fillText("Add ≥ 3 vertices then press Close & Optimize", W / 2, H / 2 + 12);
      return;
    }

    const tf = isClosed ? computeTransform(polygon, W, H) : { scale: 1, offsetX: 0, offsetY: 0 };
    transformRef.current = tf;
    const { scale, offsetX, offsetY } = tf;
    const tx = (p: Pt) => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY });

    // Outer polygon
    if (polygon.length >= 2) {
      const tPoly = polygon.map(tx);
      ctx.beginPath();
      ctx.moveTo(tPoly[0].x, tPoly[0].y);
      for (let i = 1; i < tPoly.length; i++) ctx.lineTo(tPoly[i].x, tPoly[i].y);
      if (polygon.length >= 3) { ctx.closePath(); ctx.fillStyle = "rgba(99,108,130,0.12)"; ctx.fill(); }
      ctx.strokeStyle = "rgba(148,163,184,0.85)"; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.stroke();
    }

    // Vertex dots
    for (const v of polygon.map(tx)) {
      ctx.beginPath(); ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b"; ctx.fill();
      ctx.strokeStyle = "#0b0e15"; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // Inset polygon
    if (insetPolygon.length > 2) {
      const tIn = insetPolygon.map(tx);
      ctx.beginPath(); ctx.moveTo(tIn[0].x, tIn[0].y);
      for (let i = 1; i < tIn.length; i++) ctx.lineTo(tIn[i].x, tIn[i].y);
      ctx.closePath();
      ctx.strokeStyle = "rgba(245,158,11,0.6)"; ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "rgba(245,158,11,0.05)"; ctx.fill();
    }

    if (spots.length === 0) {
      // Entry/exit markers even if no spots yet
      if (entryPoint) { const ep = tx(entryPoint); drawMarker(ctx, ep.x, ep.y, "IN", "#10b981", "#059669"); }
      if (exitPoint)  { const xp = tx(exitPoint);  drawMarker(ctx, xp.x, xp.y, "OUT", "#ef4444", "#dc2626"); }
      return;
    }

    // Spots
    const laneColorMap = new Map<number, string>();
    for (const l of lanes) laneColorMap.set(l.id, LANE_COLORS[l.id % LANE_COLORS.length]);
    const spotR = Math.max(4, Math.min(12, scale * 5));

    for (const s of spots) {
      const tp = tx(s);
      const isDone   = completedSpotIds?.has(s.id);
      const isActive = activeSpotId === s.id;
      const isHov    = hoveredRef.current === s.id;

      let fill: string, stroke: string;
      if (simulationMode) {
        if (isDone)        { fill = "rgba(16,185,129,0.92)"; stroke = "#10b981"; }
        else if (isActive) { fill = "#ffffff";               stroke = "#ffffff"; }
        else               { fill = "rgba(239,68,68,0.80)";  stroke = "#ef4444"; }
      } else {
        const lc = laneColorMap.get(s.laneId) ?? "#f59e0b";
        fill   = lc + "cc"; stroke = lc;
        if (sweepAngle !== null) { fill = "rgba(245,158,11,0.65)"; stroke = "#f59e0b"; }
      }

      const r = (isHov || isActive) ? spotR + 2 : spotR;
      ctx.beginPath(); ctx.arc(tp.x, tp.y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = isHov ? 2.5 : 1.5; ctx.stroke();

      if (scale > 5 && !simulationMode) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = `${Math.max(6, spotR * 0.85)}px JetBrains Mono, monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(s.globalSequence + 1), tp.x, tp.y);
      }
    }

    // Lane labels
    if (!simulationMode && sweepAngle === null && lanes.length > 0 && scale > 1.5) {
      for (const lane of lanes) {
        const ls = spots.filter((s) => s.laneId === lane.id);
        if (ls.length === 0) continue;
        const avgX = ls.reduce((a, s) => a + s.x, 0) / ls.length;
        const minY = Math.min(...ls.map((s) => s.y));
        const tp = tx({ x: avgX, y: minY });
        ctx.fillStyle = LANE_COLORS[lane.id % LANE_COLORS.length];
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(`L${lane.id}`, tp.x, tp.y - spotR - 4);
      }
    }

    // Sweep overlay
    if (sweepAngle !== null) {
      ctx.save();
      ctx.fillStyle = "rgba(245,158,11,0.08)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(245,158,11,0.9)";
      ctx.font = "bold 18px JetBrains Mono, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(`Testing ${sweepAngle}°  ·  ${spots.length} spots`, W / 2, 10);
      ctx.restore();
    }

    // Entry / Exit markers (drawn last so they're on top)
    if (entryPoint) { const ep = tx(entryPoint); drawMarker(ctx, ep.x, ep.y, "IN", "#10b981", "#059669"); }
    if (exitPoint)  { const xp = tx(exitPoint);  drawMarker(ctx, xp.x, xp.y, "OUT", "#ef4444", "#dc2626"); }
  }, [polygon, insetPolygon, spots, lanes, isClosed, entryPoint, exitPoint, completedSpotIds, activeSpotId, simulationMode, sweepAngle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; draw();
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; draw();
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  const screenToLocal = useCallback((cx: number, cy: number) => {
    const { scale, offsetX, offsetY } = transformRef.current;
    return { x: (cx - offsetX) / scale, y: (cy - offsetY) / scale };
  }, []);

  const getXY = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { cx: e.clientX - r.left, cy: e.clientY - r.top };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.preventDefault();
    const { cx, cy } = getXY(e);

    if (spots.length > 0 && isClosed) {
      const { scale, offsetX, offsetY } = transformRef.current;
      const sr = Math.max(4, Math.min(12, scale * 5)) + 6;
      for (const s of spots) {
        const sx = s.x * scale + offsetX, sy = s.y * scale + offsetY;
        if (Math.hypot(cx - sx, cy - sy) <= sr) { onSpotClick?.(s); return; }
      }
    }

    const local = screenToLocal(cx, cy);
    onCanvasClick?.(local.x, local.y);
  }, [readOnly, spots, isClosed, getXY, screenToLocal, onCanvasClick, onSpotClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (spots.length === 0) return;
    const { cx, cy } = getXY(e);
    const { scale, offsetX, offsetY } = transformRef.current;
    const sr = Math.max(4, Math.min(12, scale * 5)) + 6;
    let found: number | null = null;
    for (const s of spots) {
      if (Math.hypot(cx - (s.x * scale + offsetX), cy - (s.y * scale + offsetY)) <= sr) { found = s.id; break; }
    }
    if (found !== hoveredRef.current) {
      hoveredRef.current = found;
      canvasRef.current!.style.cursor = found !== null ? "pointer" : (readOnly ? "default" : "crosshair");
      draw();
    }
  }, [spots, getXY, draw, readOnly]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ cursor: readOnly ? "default" : "crosshair" }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
