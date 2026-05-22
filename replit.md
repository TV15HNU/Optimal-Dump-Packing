# Optimal Dump Packing

_Industrial planning and simulation platform for autonomous mining haul trucks — uses adaptive polygon spot-point packing (hexagonal close packing + rotation optimization + turning-radius inset buffering) to improve dump density 2.4× over current autonomous systems._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/dump-packing run dev` — run the web frontend (port 19474)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- No database needed — all stateless computation

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + framer-motion + recharts + Leaflet
- API: Express 5 (port 8080, path `/api/v1/...`)
- No database — purely stateless computation
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `artifacts/api-server/src/lib/hexPacker.ts` — core hex packing algorithm
- `artifacts/api-server/src/lib/geometry.ts` — polygon math (inset, pip, GPS→local)
- `artifacts/api-server/src/lib/truckPresets.ts` — 4 truck profiles + 5 preset polygons
- `artifacts/api-server/src/routes/` — pack.ts + analysis.ts routes
- `artifacts/dump-packing/src/engine/localEngine.ts` — client-side JS packing engine
- `artifacts/dump-packing/src/components/` — PlannerTab, SimulationTab, AnalyticsTab, MapTab, ExportTab, PackingCanvas

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks
- Turning radius encoded as polygon inset distance (no hardware changes required)
- Dual engine: server-side for final export, client-side (localEngine.ts) for instant preview
- Hex packing: 60° symmetry → only 0–60° rotation sweep needed for full optimization
- All geometry is pure TypeScript — no native deps, deterministic, testable
- Gap-fill: post-processing second pass at winning angle fills boundary voids (step=0.46×spacing, clearance=0.88×spacing)

## Product

- **Planner Tab**: Draw or load polygon, select truck, run hex packing, fill gaps, click spots for metadata, set entry/exit points
- **Simulation Tab**: Watch farthest-first dispatch animation with progress tracking
- **Analytics Tab**: Dual-mode (Planner | Map/GPS) live metrics with estimated fill time
- **Map / GPS Tab**: Leaflet map, GPS polygon input, spot overlay on map, entry/exit click, import plan JSON
- **Export Tab**: Download plan JSON (includes entry/exit, GPS polygon if available)

## User preferences

- Dark industrial aesthetic: background #0f1117, amber primary (#f59e0b), card #1a1f2e
- Sharp edges for industrial feel (border-radius minimal)
- JetBrains Mono for all numeric/code values, Inter for UI text
- Never use console.log in server code — use req.log / logger singleton

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec changes
- Vite config requires PORT and BASE_PATH env vars (injected by workflow runner)
- Leaflet CSS imported dynamically to avoid SSR issues
- framer-motion and recharts must be in optimizeDeps.include (dedupe React context)
- Hex packing symmetry: scan 0–60° only (not 0–360°)
- Gap-fill spots use zoneId=1 and laneId=-1 for visual distinction
- Entry/exit in Map/GPS: GPS click → local coords → projectToNearestEdge → back to GPS for Leaflet marker

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

## Best Version

- Commit: `aef6f06260e217b8787522e4159d22a104c20066`
- Label: **BEST VERSION** — full feature set with auth + DB: Clerk auth (email/password + Google), role-based login (Supervisor/Driver selector on landing), Dashboard with high-res site canvas, auto-demo spot-fill, daily report modal, custom trucks persisted to PostgreSQL with duplicate-name override modal, Map/GPS 0–59° sweep (1° step), Export/Import with post-import save-to-dashboard, entry/exit GPS coord inputs, Fill Edge Gaps in Map tab.
- To restore: roll back to this checkpoint via Replit history.

## Previous Best Versions

- Commit: `85e01517e4a17508378d8dd0fb190eba3c258e1b`
- Label: Working planner with identity transform fix, rotation sweep, custom truck form, simulation, Map/GPS world zoom, iteration thumbnails, export JSON.
