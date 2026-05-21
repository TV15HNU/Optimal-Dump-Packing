import type { TruckProfile } from "./hexPacker.js";

export const TRUCK_PRESETS: TruckProfile[] = [
  {
    id: "cat-793",
    name: "CAT 793",
    width: 9.14,
    length: 14.71,
    turningRadius: 12.0,
    spacingX: 13.5,
    spacingY: 13.5,
    payloadTonnes: 227,
  },
  {
    id: "cat-797f",
    name: "CAT 797F",
    width: 9.75,
    length: 15.09,
    turningRadius: 14.5,
    spacingX: 16.0,
    spacingY: 16.0,
    payloadTonnes: 363,
  },
  {
    id: "cat-789d",
    name: "CAT 789D",
    width: 8.43,
    length: 13.62,
    turningRadius: 11.0,
    spacingX: 12.0,
    spacingY: 12.0,
    payloadTonnes: 181,
  },
  {
    id: "komatsu-930e",
    name: "Komatsu 930E",
    width: 9.4,
    length: 15.4,
    turningRadius: 13.5,
    spacingX: 15.0,
    spacingY: 15.0,
    payloadTonnes: 291,
  },
];

export const SIMULATION_POLYGONS = [
  {
    id: "rectangle-large",
    name: "Large Rectangular Dump",
    description: "Standard large rectangular dump terrace — 200m × 150m",
    polygon: [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 150 },
      { x: 0, y: 150 },
    ],
  },
  {
    id: "irregular-l-shape",
    name: "L-Shaped Terrace",
    description: "Irregular L-shaped dump area with constrained access corridor",
    polygon: [
      { x: 0, y: 0 },
      { x: 180, y: 0 },
      { x: 180, y: 80 },
      { x: 100, y: 80 },
      { x: 100, y: 160 },
      { x: 0, y: 160 },
    ],
  },
  {
    id: "trapezoidal",
    name: "Trapezoidal Bench",
    description: "Trapezoidal bench dump typical of open-pit terracing",
    polygon: [
      { x: 30, y: 0 },
      { x: 220, y: 0 },
      { x: 250, y: 120 },
      { x: 0, y: 120 },
    ],
  },
  {
    id: "pentagon-dump",
    name: "Pentagonal Dump Zone",
    description: "5-sided irregular polygon representing a curved dump face",
    polygon: [
      { x: 100, y: 0 },
      { x: 220, y: 60 },
      { x: 190, y: 180 },
      { x: 50, y: 190 },
      { x: 0, y: 80 },
    ],
  },
  {
    id: "narrow-strip",
    name: "Narrow Strip Dump",
    description: "High-aspect-ratio narrow strip dump along an access ramp",
    polygon: [
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 310, y: 60 },
      { x: 10, y: 60 },
    ],
  },
];
