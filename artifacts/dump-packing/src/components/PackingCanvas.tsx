import { useRef, useEffect, useCallback } from "react";
import type { Pt } from "@/engine/localEngine";
import type { SpotLocal, LaneLocal } from "@/engine/localEngine";

const LANE_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#a855f7",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

interface Props {
  polygon: Pt[];
  insetPolygon: Pt[];
  spots: SpotLocal[];
  lanes: LaneLocal[];
  completedSpotIds?: Set<number>;
  activeSpotId?: number | null;
  onCanvasClick?: (localX: number, localY: number) => void;
  onSpotClick?: (spot: SpotLocal) => void;
  readOnly?: boolean;
  showGrid?: boolean;
}

function transform(pts: Pt[], width: number, height: number, pad = 40): {
  pts: { x: number; y: number }[];
  scale: number;
  offsetX: number;
  offsetY: number;
} {
  if (pts.length === 0) return { pts: [], scale: 1, offsetX: 0, offsetY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
  }
  const scaleX = (width - pad * 2) / Math.max(maxX - minX, 1);
  const scaleY = (height - pad * 2) / Math.max(maxY - minY, 1);
  const scale = Math.min(scaleX, scaleY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const offsetX = width / 2 - centerX * scale;
  const offsetY = height / 2 - centerY * scale;
  return {
    pts: pts.map((p) => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY })),
    scale, offsetX, offsetY,
  };
}

export default function PackingCanvas({
  polygon, insetPolygon, spots, lanes, completedSpotIds,
  activeSpotId, onCanvasClick, onSpotClick, readOnly = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const allPts = [...polygon, ...insetPolygon];
    if (allPts.length === 0 && spots.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Click on the canvas to draw polygon vertices", W / 2, H / 2 - 10);
      ctx.fillText("Double-click to close the polygon", W / 2, H / 2 + 14);
      return;
    }

    const { scale, offsetX, offsetY } = transform(
      allPts.length > 0 ? allPts : spots.map((s) => ({ x: s.x, y: s.y })),
      W, H
    );
    const tx = (p: Pt) => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY });

    // Draw polygon fill
    if (polygon.length > 2) {
      const tPoly = polygon.map(tx);
      ctx.beginPath();
      ctx.moveTo(tPoly[0].x, tPoly[0].y);
      for (let i = 1; i < tPoly.length; i++) ctx.lineTo(tPoly[i].x, tPoly[i].y);
      ctx.closePath();
      ctx.fillStyle = "rgba(99,108,130,0.15)";
      ctx.fill();
      ctx.strokeStyle = "rgba(148,163,184,0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // In-progress polygon (open)
    if (polygon.length > 0 && polygon.length <= 2) {
      const tPoly = polygon.map(tx);
      ctx.beginPath();
      ctx.moveTo(tPoly[0].x, tPoly[0].y);
      for (let i = 1; i < tPoly.length; i++) ctx.lineTo(tPoly[i].x, tPoly[i].y);
      ctx.strokeStyle = "rgba(148,163,184,0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Vertex dots
    for (const v of polygon.map(tx)) {
      ctx.beginPath();
      ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b";
      ctx.fill();
      ctx.strokeStyle = "#1e2533";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Inset polygon
    if (insetPolygon.length > 2) {
      const tInset = insetPolygon.map(tx);
      ctx.beginPath();
      ctx.moveTo(tInset[0].x, tInset[0].y);
      for (let i = 1; i < tInset.length; i++) ctx.lineTo(tInset[i].x, tInset[i].y);
      ctx.closePath();
      ctx.strokeStyle = "rgba(245,158,11,0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Spots
    const laneColorMap = new Map<number, string>();
    for (const l of lanes) laneColorMap.set(l.id, LANE_COLORS[l.id % LANE_COLORS.length]);
    const spotR = Math.max(3, Math.min(10, scale * 4));

    for (const s of spots) {
      const tp = tx(s);
      const isDone = completedSpotIds?.has(s.id);
      const isActive = activeSpotId === s.id;
      const isHovered = hoveredRef.current === s.id;
      const color = laneColorMap.get(s.laneId) ?? "#f59e0b";

      ctx.beginPath();
      ctx.arc(tp.x, tp.y, isHovered || isActive ? spotR + 2 : spotR, 0, Math.PI * 2);
      if (isDone) {
        ctx.fillStyle = "rgba(16,185,129,0.85)";
      } else if (isActive) {
        ctx.fillStyle = "#ffffff";
      } else {
        ctx.fillStyle = color + "cc";
      }
      ctx.fill();
      ctx.strokeStyle = isDone ? "#10b981" : isActive ? "#ffffff" : color;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();

      if (scale > 4 && !isDone && !isActive) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = `${Math.max(6, spotR * 0.8)}px JetBrains Mono, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(s.globalSequence + 1), tp.x, tp.y);
      }
    }

    // Lane labels
    if (lanes.length > 0 && scale > 1) {
      for (const lane of lanes) {
        const laneSpots = spots.filter((s) => s.laneId === lane.id);
        if (laneSpots.length === 0) continue;
        const avgX = laneSpots.reduce((a, s) => a + s.x, 0) / laneSpots.length;
        const minY = Math.min(...laneSpots.map((s) => s.y));
        const tp = tx({ x: avgX, y: minY });
        const color = LANE_COLORS[lane.id % LANE_COLORS.length];
        ctx.fillStyle = color;
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`L${lane.id}`, tp.x, tp.y - spotR - 6);
      }
    }
  }, [polygon, insetPolygon, spots, lanes, completedSpotIds, activeSpotId]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    draw();
    return () => ro.disconnect();
  }, [draw]);

  const getLocalCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const allPts = [...polygon, ...insetPolygon];
    if (allPts.length === 0 && spots.length === 0) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    const { scale, offsetX, offsetY } = transform(
      allPts.length > 0 ? allPts : spots.map((s) => ({ x: s.x, y: s.y })),
      canvas.width, canvas.height
    );
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    return { x: (cx - offsetX) / scale, y: (cy - offsetY) / scale };
  }, [polygon, insetPolygon, spots]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const coords = getLocalCoords(e);
    if (!coords) return;

    // Check if clicking on a spot
    if (spots.length > 0) {
      const allPts = [...polygon, ...insetPolygon];
      const { scale, offsetX, offsetY } = transform(
        allPts.length > 0 ? allPts : spots.map((s) => ({ x: s.x, y: s.y })),
        canvasRef.current!.width, canvasRef.current!.height
      );
      const spotR = Math.max(3, Math.min(10, scale * 4)) + 4;
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      for (const s of spots) {
        const tx = s.x * scale + offsetX;
        const ty = s.y * scale + offsetY;
        if (Math.hypot(cx - tx, cy - ty) <= spotR) {
          onSpotClick?.(s);
          return;
        }
      }
    }

    onCanvasClick?.(coords.x, coords.y);
  }, [readOnly, getLocalCoords, polygon, insetPolygon, spots, onCanvasClick, onSpotClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (spots.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const allPts = [...polygon, ...insetPolygon];
    const { scale, offsetX, offsetY } = transform(
      allPts.length > 0 ? allPts : spots.map((s) => ({ x: s.x, y: s.y })),
      canvas.width, canvas.height
    );
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const spotR = Math.max(3, Math.min(10, scale * 4)) + 6;
    let found: number | null = null;
    for (const s of spots) {
      const tx = s.x * scale + offsetX;
      const ty = s.y * scale + offsetY;
      if (Math.hypot(cx - tx, cy - ty) <= spotR) { found = s.id; break; }
    }
    if (found !== hoveredRef.current) {
      hoveredRef.current = found;
      canvas.style.cursor = found !== null ? "pointer" : "crosshair";
      draw();
    }
  }, [spots, polygon, insetPolygon, draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ cursor: readOnly ? "default" : "crosshair" }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      data-testid="packing-canvas"
    />
  );
}
