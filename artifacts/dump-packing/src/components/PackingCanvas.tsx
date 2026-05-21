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
  completedSpotIds?: Set<number>;
  activeSpotId?: number | null;
  onCanvasClick?: (localX: number, localY: number) => void;
  onSpotClick?: (spot: SpotLocal) => void;
  readOnly?: boolean;
  simulationMode?: boolean;   // red pending → green done
  sweepAngle?: number | null; // highlight current sweep angle
}

/** Lock viewport to the polygon bounding box — spots/inset don't shift it */
function computeTransform(polyPts: Pt[], width: number, height: number, pad = 52) {
  if (polyPts.length === 0) return { scale: 1, offsetX: width / 2, offsetY: height / 2 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polyPts) {
    if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
  }
  const dx = maxX - minX || 1, dy = maxY - minY || 1;
  const scaleX = (width - pad * 2) / dx;
  const scaleY = (height - pad * 2) / dy;
  const scale = Math.min(scaleX, scaleY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return {
    scale,
    offsetX: width / 2 - centerX * scale,
    offsetY: height / 2 - centerY * scale,
  };
}

export default function PackingCanvas({
  polygon, insetPolygon, spots, lanes, completedSpotIds,
  activeSpotId, onCanvasClick, onSpotClick, readOnly = false,
  simulationMode = false, sweepAngle = null,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredRef = useRef<number | null>(null);
  const transformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Subtle dot-grid background
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    for (let x = 20; x < W; x += 32) for (let y = 20; y < H; y += 32) {
      ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
    }

    if (polygon.length === 0 && spots.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.font = "14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Click to add polygon vertices", W / 2, H / 2 - 12);
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.font = "12px Inter, sans-serif";
      ctx.fillText("Double-click or press Close to finish", W / 2, H / 2 + 12);
      return;
    }

    // Lock viewport to polygon — never include spots/inset in the reference
    const refPts = polygon.length > 0 ? polygon : spots.map((s) => ({ x: s.x, y: s.y }));
    const { scale, offsetX, offsetY } = computeTransform(refPts, W, H);
    transformRef.current = { scale, offsetX, offsetY };

    const tx = (p: Pt) => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY });

    // Outer polygon fill + stroke
    if (polygon.length >= 2) {
      const tPoly = polygon.map(tx);
      ctx.beginPath();
      ctx.moveTo(tPoly[0].x, tPoly[0].y);
      for (let i = 1; i < tPoly.length; i++) ctx.lineTo(tPoly[i].x, tPoly[i].y);
      if (polygon.length >= 3) ctx.closePath();
      if (polygon.length >= 3) {
        ctx.fillStyle = "rgba(99,108,130,0.12)";
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(148,163,184,0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Vertex dots
    for (const v of polygon.map(tx)) {
      ctx.beginPath();
      ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b";
      ctx.fill();
      ctx.strokeStyle = "#0b0e15";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Inset polygon (dashed amber)
    if (insetPolygon.length > 2) {
      const tInset = insetPolygon.map(tx);
      ctx.beginPath();
      ctx.moveTo(tInset[0].x, tInset[0].y);
      for (let i = 1; i < tInset.length; i++) ctx.lineTo(tInset[i].x, tInset[i].y);
      ctx.closePath();
      ctx.strokeStyle = "rgba(245,158,11,0.55)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (spots.length === 0) return;

    // Spots
    const laneColorMap = new Map<number, string>();
    for (const l of lanes) laneColorMap.set(l.id, LANE_COLORS[l.id % LANE_COLORS.length]);
    const spotR = Math.max(3.5, Math.min(11, scale * 4.5));

    for (const s of spots) {
      const tp = tx(s);
      const isDone = completedSpotIds?.has(s.id);
      const isActive = activeSpotId === s.id;
      const isHovered = hoveredRef.current === s.id;

      let fillColor: string;
      let strokeColor: string;

      if (simulationMode) {
        if (isDone) { fillColor = "rgba(16,185,129,0.9)"; strokeColor = "#10b981"; }
        else if (isActive) { fillColor = "#ffffff"; strokeColor = "#ffffff"; }
        else { fillColor = "rgba(239,68,68,0.75)"; strokeColor = "#ef4444"; }
      } else {
        const laneColor = laneColorMap.get(s.laneId) ?? "#f59e0b";
        fillColor = laneColor + "cc";
        strokeColor = laneColor;
        if (sweepAngle !== null) {
          fillColor = "rgba(245,158,11,0.55)";
          strokeColor = "#f59e0b";
        }
      }

      const r = (isHovered || isActive) ? spotR + 2 : spotR;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, r, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.stroke();

      // Label spot number if zoomed in enough
      if (scale > 4 && !simulationMode) {
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.font = `${Math.max(6, spotR * 0.85)}px JetBrains Mono, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(s.globalSequence + 1), tp.x, tp.y);
      }
    }

    // Lane labels
    if (!simulationMode && lanes.length > 0 && scale > 1) {
      for (const lane of lanes) {
        const laneSpots = spots.filter((s) => s.laneId === lane.id);
        if (laneSpots.length === 0) continue;
        const avgX = laneSpots.reduce((a, s) => a + s.x, 0) / laneSpots.length;
        const minY = Math.min(...laneSpots.map((s) => s.y));
        const tp = tx({ x: avgX, y: minY });
        ctx.fillStyle = LANE_COLORS[lane.id % LANE_COLORS.length];
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const spotR2 = Math.max(3.5, Math.min(11, scale * 4.5));
        ctx.fillText(`L${lane.id}`, tp.x, tp.y - spotR2 - 4);
      }
    }

    // Sweep angle label overlay
    if (sweepAngle !== null) {
      ctx.save();
      ctx.fillStyle = "rgba(245,158,11,0.15)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 20px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`Testing ${sweepAngle}° — ${spots.length} spots`, W / 2, 12);
      ctx.restore();
    }
  }, [polygon, insetPolygon, spots, lanes, completedSpotIds, activeSpotId, simulationMode, sweepAngle]);

  // Resize observer
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

  // Redraw on props change
  useEffect(() => { draw(); }, [draw]);

  // Convert screen coords → local polygon coords using locked transform
  const screenToLocal = useCallback((cx: number, cy: number) => {
    const { scale, offsetX, offsetY } = transformRef.current;
    return { x: (cx - offsetX) / scale, y: (cy - offsetY) / scale };
  }, []);

  const getCanvasXY = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { cx: e.clientX - rect.left, cy: e.clientY - rect.top };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.preventDefault();
    const { cx, cy } = getCanvasXY(e);

    // Check if clicking on an existing spot
    if (spots.length > 0) {
      const { scale, offsetX, offsetY } = transformRef.current;
      const spotR = Math.max(3.5, Math.min(11, scale * 4.5)) + 5;
      for (const s of spots) {
        const sx = s.x * scale + offsetX;
        const sy = s.y * scale + offsetY;
        if (Math.hypot(cx - sx, cy - sy) <= spotR) {
          onSpotClick?.(s);
          return;
        }
      }
    }

    const local = screenToLocal(cx, cy);
    onCanvasClick?.(local.x, local.y);
  }, [readOnly, spots, getCanvasXY, screenToLocal, onCanvasClick, onSpotClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (spots.length === 0) return;
    const { cx, cy } = getCanvasXY(e);
    const { scale, offsetX, offsetY } = transformRef.current;
    const spotR = Math.max(3.5, Math.min(11, scale * 4.5)) + 6;
    let found: number | null = null;
    for (const s of spots) {
      const sx = s.x * scale + offsetX;
      const sy = s.y * scale + offsetY;
      if (Math.hypot(cx - sx, cy - sy) <= spotR) { found = s.id; break; }
    }
    if (found !== hoveredRef.current) {
      hoveredRef.current = found;
      canvasRef.current!.style.cursor = found !== null ? "pointer" : (readOnly ? "default" : "crosshair");
      draw();
    }
  }, [spots, getCanvasXY, draw, readOnly]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ cursor: readOnly ? "default" : "crosshair" }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onContextMenu={handleContextMenu}
      data-testid="packing-canvas"
    />
  );
}
