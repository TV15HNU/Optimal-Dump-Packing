export type Pt = { x: number; y: number };
export type Poly = Pt[];

export interface TruckConfig {
  id: string;
  name: string;
  width: number;
  length: number;
  turningRadius: number;
  spacingX: number;
  spacingY: number;
  payloadTonnes: number;
}

export interface SpotLocal {
  id: number;
  x: number;
  y: number;
  laneId: number;
  sequenceInLane: number;
  globalSequence: number;
  zoneId: number;
  rotation: number;
  safe: boolean;
}

export interface LaneLocal {
  id: number;
  spotIds: number[];
  approachAngle: number;
}

export interface RotScore { angle: number; spotCount: number; }

export interface LocalPackResult {
  spots: SpotLocal[];
  lanes: LaneLocal[];
  polygon: Pt[];
  insetPolygon: Pt[];
  bestRotation: number;
  rotationScores: RotScore[];
  entryPoint: Pt | null;
  exitPoint: Pt | null;
  metrics: {
    spotCount: number;
    squareGridCount: number;
    improvementPercent: number;
    utilizationEfficiency: number;
    hexPackEfficiency: number;
    squarePackEfficiency: number;
    insetArea: number;
    totalArea: number;
  };
}

function polyArea(pts: Poly): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a) / 2;
}

function ensureCCW(pts: Poly): Poly {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    s += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return s < 0 ? [...pts].reverse() : pts;
}

function centroid(pts: Poly): Pt {
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p.x; cy += p.y; }
  return { x: cx / pts.length, y: cy / pts.length };
}

function rotatePt(p: Pt, rad: number, o: Pt): Pt {
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const dx = p.x - o.x, dy = p.y - o.y;
  return { x: o.x + dx * cos - dy * sin, y: o.y + dx * sin + dy * cos };
}

function pip(p: Pt, poly: Poly): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function norm(v: Pt): Pt {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

function lineIntersect(p1: Pt, d1: Pt, p2: Pt, d2: Pt): Pt | null {
  const cross = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(cross) < 1e-10) return null;
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const t = (dx * d2.y - dy * d2.x) / cross;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}

export function insetPoly(pts: Poly, dist: number): Poly {
  if (pts.length < 3) return [];
  const ccw = ensureCCW(pts);
  const n = ccw.length;
  const edges: { p: Pt; d: Pt }[] = [];
  for (let i = 0; i < n; i++) {
    const a = ccw[i], b = ccw[(i + 1) % n];
    const dx = b.x - a.x, dy = b.y - a.y;
    const inorm = norm({ x: -dy, y: dx });
    edges.push({ p: { x: a.x + inorm.x * dist, y: a.y + inorm.y * dist }, d: norm({ x: dx, y: dy }) });
  }
  const res: Poly = [];
  for (let i = 0; i < n; i++) {
    const prev = edges[(i + n - 1) % n], curr = edges[i];
    const pt = lineIntersect(prev.p, prev.d, curr.p, curr.d);
    res.push(pt ?? curr.p);
  }
  return polyArea(res) < 1 ? [] : res;
}

function bbox(pts: Poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function hexGridAtAngle(inset: Poly, sx: number, sy: number, angleDeg: number): Pt[] {
  if (inset.length < 3) return [];
  const c = centroid(inset);
  const rad = -(angleDeg * Math.PI) / 180;
  const bb = bbox(inset);
  const pad = Math.max(sx, sy) * 2;
  const rowH = sy * Math.sqrt(3) / 2;
  const pts: Pt[] = [];
  let row = 0;
  for (let y = bb.minY - pad; y <= bb.maxY + pad; y += rowH) {
    const off = (row % 2) * (sx / 2);
    for (let x = bb.minX - pad + off; x <= bb.maxX + pad; x += sx) {
      pts.push(rotatePt({ x, y }, rad, c));
    }
    row++;
  }
  return pts.filter((p) => pip(p, inset));
}

function squareGrid(inset: Poly, sx: number, sy: number): number {
  if (inset.length < 3) return 0;
  const bb = bbox(inset);
  let count = 0;
  for (let y = bb.minY; y <= bb.maxY; y += sy)
    for (let x = bb.minX; x <= bb.maxX; x += sx)
      if (pip({ x, y }, inset)) count++;
  return count;
}

function buildSpotsFromPoints(pts: Pt[], inset: Poly, angleDeg: number, spacingX: number): { spots: SpotLocal[]; lanes: LaneLocal[] } {
  const bb = inset.length > 2 ? bbox(inset) : { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  const laneWidth = Math.max((bb.maxX - bb.minX) / Math.max(pts.length / 4, 1), spacingX * 1.5);

  const spots: SpotLocal[] = pts.map((p, i) => ({
    id: i, x: p.x, y: p.y,
    laneId: Math.max(0, Math.floor((p.x - bb.minX) / laneWidth)),
    sequenceInLane: 0, globalSequence: 0, zoneId: 0, rotation: angleDeg, safe: true,
  }));

  const laneMap = new Map<number, SpotLocal[]>();
  for (const s of spots) {
    if (!laneMap.has(s.laneId)) laneMap.set(s.laneId, []);
    laneMap.get(s.laneId)!.push(s);
  }

  const lanes: LaneLocal[] = [];
  let globalSeq = 0;
  const laneIds = Array.from(laneMap.keys()).sort((a, b) => a - b);
  for (const lid of laneIds) {
    const ls = laneMap.get(lid)!.sort((a, b) => b.y - a.y);
    ls.forEach((s, i) => { s.sequenceInLane = i; });
    lanes.push({ id: lid, spotIds: ls.map((s) => s.id), approachAngle: 90 });
  }
  const maxL = Math.max(...lanes.map((l) => l.spotIds.length), 0);
  for (let i = 0; i < maxL; i++) {
    for (const lid of laneIds) {
      const ls = laneMap.get(lid)!;
      if (i < ls.length) ls[i].globalSequence = globalSeq++;
    }
  }
  return { spots, lanes };
}

/** Project a point onto the nearest polygon edge (boundary snap for entry/exit) */
export function projectToNearestEdge(pt: Pt, polygon: Poly): Pt {
  let bestDist = Infinity, bestPt: Pt = polygon[0];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2));
    const proj = { x: a.x + t * dx, y: a.y + t * dy };
    const d = Math.hypot(pt.x - proj.x, pt.y - proj.y);
    if (d < bestDist) { bestDist = d; bestPt = proj; }
  }
  return bestPt;
}

/**
 * Sort spots for optimal dispatch: farthest from entry first.
 * This ensures trucks go deep into the dump zone first so returning
 * trucks don't block trucks heading to farther spots.
 */
export function sortSpotsByDispatch(spots: SpotLocal[], entryPt: Pt): SpotLocal[] {
  return [...spots]
    .sort((a, b) => Math.hypot(b.x - entryPt.x, b.y - entryPt.y) - Math.hypot(a.x - entryPt.x, a.y - entryPt.y))
    .map((s, i) => ({ ...s, globalSequence: i }));
}

/** Run packing at a single fixed angle — for animation sweep */
export function runAtAngle(polygon: Poly, truck: TruckConfig, angleDeg: number): LocalPackResult {
  const inset = insetPoly(polygon, truck.turningRadius);
  const totalArea = polyArea(polygon);
  const insetArea = polyArea(inset);
  const pts = hexGridAtAngle(inset, truck.spacingX, truck.spacingY, angleDeg);
  const { spots, lanes } = buildSpotsFromPoints(pts, inset, angleDeg, truck.spacingX);
  const squareCount = squareGrid(inset, truck.spacingX, truck.spacingY);
  const spotArea = Math.PI * Math.pow(truck.width / 2, 2);
  const util = insetArea > 0 ? (pts.length * spotArea) / insetArea : 0;
  const improvement = squareCount > 0 ? ((pts.length - squareCount) / squareCount) * 100 : 0;
  return {
    spots, lanes, polygon, insetPolygon: inset,
    bestRotation: angleDeg, rotationScores: [{ angle: angleDeg, spotCount: pts.length }],
    entryPoint: null, exitPoint: null,
    metrics: { spotCount: pts.length, squareGridCount: squareCount, improvementPercent: improvement, utilizationEfficiency: util, hexPackEfficiency: 0.9069, squarePackEfficiency: 0.7854, insetArea, totalArea },
  };
}

export function runLocalEngine(polygon: Poly, truck: TruckConfig, rotStep = 5): LocalPackResult {
  if (polygon.length < 3) {
    return {
      spots: [], lanes: [], polygon, insetPolygon: [],
      bestRotation: 0, rotationScores: [], entryPoint: null, exitPoint: null,
      metrics: { spotCount: 0, squareGridCount: 0, improvementPercent: 0, utilizationEfficiency: 0, hexPackEfficiency: 0.9069, squarePackEfficiency: 0.7854, insetArea: 0, totalArea: 0 }
    };
  }

  const inset = insetPoly(polygon, truck.turningRadius);
  const totalArea = polyArea(polygon);
  const insetArea = polyArea(inset);

  const scores: RotScore[] = [];
  let bestAngle = 0, bestCount = 0, bestPts: Pt[] = [];

  // 0–60° is mathematically complete for hex packing (60° rotational symmetry)
  for (let a = 0; a < 60; a += rotStep) {
    const pts = hexGridAtAngle(inset, truck.spacingX, truck.spacingY, a);
    scores.push({ angle: a, spotCount: pts.length });
    if (pts.length > bestCount) { bestCount = pts.length; bestAngle = a; bestPts = pts; }
  }

  const squareCount = squareGrid(inset, truck.spacingX, truck.spacingY);
  const { spots, lanes } = buildSpotsFromPoints(bestPts, inset, bestAngle, truck.spacingX);
  const spotArea = Math.PI * Math.pow(truck.width / 2, 2);
  const util = insetArea > 0 ? (bestCount * spotArea) / insetArea : 0;
  const improvement = squareCount > 0 ? ((bestCount - squareCount) / squareCount) * 100 : 0;

  return {
    spots, lanes, polygon, insetPolygon: inset,
    bestRotation: bestAngle, rotationScores: scores,
    entryPoint: null, exitPoint: null,
    metrics: { spotCount: bestCount, squareGridCount: squareCount, improvementPercent: improvement, utilizationEfficiency: util, hexPackEfficiency: 0.9069, squarePackEfficiency: 0.7854, insetArea, totalArea },
  };
}

// Truck cycle time for dump operation (minutes per spot, industry benchmarks)
export const TRUCK_CYCLE_TIMES: Record<string, number> = {
  "cat-793":  4.5,
  "cat-797f": 6.0,
  "cat-789d": 3.8,
};
export const DEFAULT_CYCLE_TIME = 5.0;

// Only 3 trucks (Komatsu 930E removed)
export const DEFAULT_TRUCKS: TruckConfig[] = [
  { id: "cat-793",  name: "CAT 793",  width: 9.14, length: 14.71, turningRadius: 12,   spacingX: 13.5, spacingY: 13.5, payloadTonnes: 227 },
  { id: "cat-797f", name: "CAT 797F", width: 9.75, length: 15.09, turningRadius: 14.5, spacingX: 16,   spacingY: 16,   payloadTonnes: 363 },
  { id: "cat-789d", name: "CAT 789D", width: 8.43, length: 13.62, turningRadius: 11,   spacingX: 12,   spacingY: 12,   payloadTonnes: 181 },
];
