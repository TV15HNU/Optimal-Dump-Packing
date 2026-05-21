import { Router, type IRouter } from "express";
import {
  insetPolygon,
  polygonArea,
  gpsToLocal,
} from "../lib/geometry.js";
import {
  runPackingWithRotation,
  computeSquareGridCount,
} from "../lib/hexPacker.js";
import { TRUCK_PRESETS, SIMULATION_POLYGONS } from "../lib/truckPresets.js";
import type { TruckProfile } from "../lib/hexPacker.js";

const router: IRouter = Router();

function resolveTruck(truckProfileId: string, customTruck?: TruckProfile): TruckProfile | null {
  if (customTruck && customTruck.id) return customTruck;
  return TRUCK_PRESETS.find((t) => t.id === truckProfileId) ?? null;
}

function buildPlan(
  polygon: { x: number; y: number }[],
  truck: TruckProfile,
  ingressAngle: number,
  rotationStep: number,
) {
  const inset = insetPolygon(polygon, truck.turningRadius);
  const totalArea = polygonArea(polygon);
  const insetArea = polygonArea(inset);

  const result = runPackingWithRotation(inset, polygon, truck, rotationStep, ingressAngle);
  const squareCount = computeSquareGridCount(inset, truck.spacingX, truck.spacingY);

  const spotCount = result.spots.length;
  const improvementPercent =
    squareCount > 0 ? ((spotCount - squareCount) / squareCount) * 100 : 0;

  const spotArea = Math.PI * Math.pow(truck.width / 2, 2);
  const utilizationEfficiency = insetArea > 0 ? (spotCount * spotArea) / insetArea : 0;

  return {
    spots: result.spots,
    lanes: result.lanes,
    polygon,
    insetPolygon: inset,
    bestRotation: result.bestRotation,
    rotationScores: result.rotationScores,
    metrics: {
      spotCount,
      squareGridCount: squareCount,
      improvementPercent,
      utilizationEfficiency,
      hexPackEfficiency: 0.9069,
      squarePackEfficiency: 0.7854,
      insetArea,
      totalArea,
    },
    truckProfile: truck,
    generatedAt: new Date().toISOString(),
  };
}

router.get("/v1/pack/presets", async (_req, res): Promise<void> => {
  res.json({
    truckProfiles: TRUCK_PRESETS,
    simulationPolygons: SIMULATION_POLYGONS,
  });
});

router.post("/v1/pack", async (req, res): Promise<void> => {
  const { polygon, truckProfileId, customTruck, ingressAngle = 0, rotationStep = 5 } = req.body;

  if (!polygon || !Array.isArray(polygon) || polygon.length < 3) {
    res.status(400).json({ error: "polygon must be an array of at least 3 points" });
    return;
  }

  for (const pt of polygon) {
    if (typeof pt.x !== "number" || typeof pt.y !== "number") {
      res.status(400).json({ error: "Each polygon point must have numeric x and y" });
      return;
    }
  }

  const truck = resolveTruck(truckProfileId, customTruck);
  if (!truck) {
    res.status(400).json({ error: `Unknown truck profile: ${truckProfileId}` });
    return;
  }

  const plan = buildPlan(polygon, truck, ingressAngle, rotationStep);
  res.json(plan);
});

router.post("/v1/pack/gps", async (req, res): Promise<void> => {
  const { gpsPolygon, truckProfileId, customTruck, ingressAngle = 0, rotationStep = 5 } = req.body;

  if (!gpsPolygon || !Array.isArray(gpsPolygon) || gpsPolygon.length < 3) {
    res.status(400).json({ error: "gpsPolygon must be an array of at least 3 GPS coordinates" });
    return;
  }

  for (const pt of gpsPolygon) {
    if (typeof pt.lat !== "number" || typeof pt.lng !== "number") {
      res.status(400).json({ error: "Each GPS point must have numeric lat and lng" });
      return;
    }
  }

  const truck = resolveTruck(truckProfileId, customTruck);
  if (!truck) {
    res.status(400).json({ error: `Unknown truck profile: ${truckProfileId}` });
    return;
  }

  const localPolygon = gpsToLocal(gpsPolygon);
  const plan = buildPlan(localPolygon, truck, ingressAngle, rotationStep);
  res.json(plan);
});

router.post("/v1/pack/export", async (req, res): Promise<void> => {
  const { plan, format = "generic-json" } = req.body;

  if (!plan) {
    res.status(400).json({ error: "plan is required" });
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `dump-plan-${plan.truckProfile?.id ?? "unknown"}-${timestamp}.json`;

  const exportData = {
    exportVersion: "1.0",
    format,
    generatedAt: new Date().toISOString(),
    project: "Optimal Dump Packing — Adaptive Polygon Spot-Point Packing",
    truckProfile: plan.truckProfile,
    bestRotationDeg: plan.bestRotation,
    metrics: plan.metrics,
    polygon: plan.polygon,
    insetPolygon: plan.insetPolygon,
    spots: plan.spots,
    lanes: plan.lanes,
  };

  res.json({
    filename,
    data: exportData,
    generatedAt: new Date().toISOString(),
  });
});

export default router;
