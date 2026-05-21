export type Point = { x: number; y: number };
export type Polygon = Point[];

export function polygonArea(pts: Polygon): number {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

export function ensureCCW(pts: Polygon): Polygon {
  let signed = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    signed += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return signed < 0 ? [...pts].reverse() : pts;
}

export function centroid(pts: Polygon): Point {
  let cx = 0;
  let cy = 0;
  for (const p of pts) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / pts.length, y: cy / pts.length };
}

export function rotatePoint(p: Point, angle: number, origin: Point): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

export function rotatePolygon(pts: Polygon, angleDeg: number): Polygon {
  const c = centroid(pts);
  const rad = (angleDeg * Math.PI) / 180;
  return pts.map((p) => rotatePoint(p, rad, c));
}

export function pointInPolygon(p: Point, poly: Polygon): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function polygonBBox(pts: Polygon): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function normalize(v: Point): Point {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function edgeInwardNormal(a: Point, b: Point, isCCW: boolean): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const n = normalize({ x: -dy, y: dx });
  return isCCW ? n : { x: -n.x, y: -n.y };
}

function lineIntersect(
  p1: Point, d1: Point,
  p2: Point, d2: Point,
): Point | null {
  const cross = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(cross) < 1e-10) return null;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const t = (dx * d2.y - dy * d2.x) / cross;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}

export function insetPolygon(pts: Polygon, dist: number): Polygon {
  const ccw = ensureCCW(pts);
  const n = ccw.length;
  const offsetEdges: { p: Point; d: Point }[] = [];

  for (let i = 0; i < n; i++) {
    const a = ccw[i];
    const b = ccw[(i + 1) % n];
    const normal = edgeInwardNormal(a, b, true);
    const offsetA: Point = { x: a.x + normal.x * dist, y: a.y + normal.y * dist };
    const dir: Point = { x: b.x - a.x, y: b.y - a.y };
    offsetEdges.push({ p: offsetA, d: normalize(dir) });
  }

  const result: Polygon = [];
  for (let i = 0; i < n; i++) {
    const prev = offsetEdges[(i + n - 1) % n];
    const curr = offsetEdges[i];
    const intersection = lineIntersect(prev.p, prev.d, curr.p, curr.d);
    if (intersection) {
      result.push(intersection);
    } else {
      result.push(curr.p);
    }
  }

  const area = polygonArea(result);
  if (area < 1) return [];
  return result;
}

export function gpsToLocal(
  coords: { lat: number; lng: number }[],
): Polygon {
  if (coords.length === 0) return [];
  const originLat = coords[0].lat;
  const originLng = coords[0].lng;
  const METERS_PER_DEG_LAT = 111320;
  return coords.map((c) => ({
    x: (c.lng - originLng) * METERS_PER_DEG_LAT * Math.cos((originLat * Math.PI) / 180),
    y: (c.lat - originLat) * METERS_PER_DEG_LAT,
  }));
}
