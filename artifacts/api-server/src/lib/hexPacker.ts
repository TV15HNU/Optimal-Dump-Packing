import type { Point, Polygon } from "./geometry.js";
import {
  polygonBBox,
  pointInPolygon,
  rotatePoint,
  centroid,
  polygonArea,
} from "./geometry.js";

export interface TruckProfile {
  id: string;
  name: string;
  width: number;
  length: number;
  turningRadius: number;
  spacingX: number;
  spacingY: number;
  payloadTonnes: number;
}

export interface SpotPoint {
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

export interface Lane {
  id: number;
  spotIds: number[];
  approachAngle: number;
}

export interface RotationScore {
  angle: number;
  spotCount: number;
}

export interface PackingResult {
  spots: SpotPoint[];
  lanes: Lane[];
  bestRotation: number;
  rotationScores: RotationScore[];
}

function generateHexGrid(
  insetPoly: Polygon,
  spacingX: number,
  spacingY: number,
  rotationDeg: number,
): Point[] {
  if (insetPoly.length < 3) return [];

  const bbox = polygonBBox(insetPoly);
  const c = centroid(insetPoly);
  const rad = -(rotationDeg * Math.PI) / 180;

  const rowHeight = spacingY * Math.sqrt(3) / 2;
  const points: Point[] = [];

  const extraPad = Math.max(spacingX, spacingY) * 2;
  const minX = bbox.minX - extraPad;
  const maxX = bbox.maxX + extraPad;
  const minY = bbox.minY - extraPad;
  const maxY = bbox.maxY + extraPad;

  let row = 0;
  for (let y = minY; y <= maxY; y += rowHeight) {
    const offset = (row % 2) * (spacingX / 2);
    for (let x = minX + offset; x <= maxX; x += spacingX) {
      const rawPt: Point = { x, y };
      const rotated = rotatePoint(rawPt, rad, c);
      points.push(rotated);
    }
    row++;
  }
  return points;
}

export function runPackingWithRotation(
  insetPoly: Polygon,
  originalPoly: Polygon,
  truck: TruckProfile,
  rotationStep = 5,
  ingressAngle = 0,
): PackingResult {
  if (insetPoly.length < 3) {
    return { spots: [], lanes: [], bestRotation: 0, rotationScores: [] };
  }

  const rotationScores: RotationScore[] = [];
  let bestAngle = 0;
  let bestCount = 0;
  let bestPoints: Point[] = [];

  for (let angle = 0; angle < 60; angle += rotationStep) {
    const pts = generateHexGrid(insetPoly, truck.spacingX, truck.spacingY, angle);
    const valid = pts.filter((p) => pointInPolygon(p, insetPoly));
    rotationScores.push({ angle, spotCount: valid.length });
    if (valid.length > bestCount) {
      bestCount = valid.length;
      bestAngle = angle;
      bestPoints = valid;
    }
  }

  const spots = buildSpots(bestPoints, bestAngle, ingressAngle, insetPoly);
  const lanes = buildLanes(spots);

  return { spots, lanes, bestRotation: bestAngle, rotationScores };
}

function buildSpots(
  points: Point[],
  rotation: number,
  ingressAngle: number,
  insetPoly: Polygon,
): SpotPoint[] {
  const bbox = polygonBBox(insetPoly);
  const cx = (bbox.minX + bbox.maxX) / 2;

  const laneWidth = Math.max((bbox.maxX - bbox.minX) / Math.max(points.length / 3, 1), 20);

  return points.map((p, i) => {
    const laneId = Math.floor((p.x - bbox.minX) / laneWidth);
    return {
      id: i,
      x: p.x,
      y: p.y,
      laneId,
      sequenceInLane: 0,
      globalSequence: 0,
      zoneId: 0,
      rotation,
      safe: true,
    };
  });
}

function buildLanes(spots: SpotPoint[]): Lane[] {
  const laneMap = new Map<number, SpotPoint[]>();
  for (const s of spots) {
    if (!laneMap.has(s.laneId)) laneMap.set(s.laneId, []);
    laneMap.get(s.laneId)!.push(s);
  }

  const lanes: Lane[] = [];
  let globalSeq = 0;

  const laneIds = Array.from(laneMap.keys()).sort((a, b) => a - b);
  for (const laneId of laneIds) {
    const laneSpots = laneMap.get(laneId)!;
    laneSpots.sort((a, b) => b.y - a.y);
    let seqInLane = 0;
    for (const s of laneSpots) {
      s.sequenceInLane = seqInLane++;
      s.globalSequence = globalSeq++;
    }
    lanes.push({
      id: laneId,
      spotIds: laneSpots.map((s) => s.id),
      approachAngle: 90,
    });
  }

  const roundRobinSpots = roundRobinInterleave(Array.from(laneMap.values()));
  for (let i = 0; i < roundRobinSpots.length; i++) {
    roundRobinSpots[i].globalSequence = i;
  }

  return lanes;
}

function roundRobinInterleave(lanes: SpotPoint[][]): SpotPoint[] {
  const result: SpotPoint[] = [];
  let maxLen = 0;
  for (const l of lanes) if (l.length > maxLen) maxLen = l.length;
  for (let i = 0; i < maxLen; i++) {
    for (const lane of lanes) {
      if (i < lane.length) result.push(lane[i]);
    }
  }
  return result;
}

export function computeSquareGridCount(
  insetPoly: Polygon,
  spacingX: number,
  spacingY: number,
): number {
  if (insetPoly.length < 3) return 0;
  const bbox = polygonBBox(insetPoly);
  let count = 0;
  for (let y = bbox.minY; y <= bbox.maxY; y += spacingY) {
    for (let x = bbox.minX; x <= bbox.maxX; x += spacingX) {
      if (pointInPolygon({ x, y }, insetPoly)) count++;
    }
  }
  return count;
}
