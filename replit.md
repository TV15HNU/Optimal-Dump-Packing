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

## Product

- **Planner Tab**: Draw or load polygon, select truck, run hex packing, click spots for metadata
- **Simulation Tab**: Watch dispatch animation lane-by-lane with progress tracking
- **Analytics Tab**: Live benchmark vs square grid, density gap KPIs, rotation scores
- **Map / GPS Tab**: Leaflet map, click to draw GPS polygon, sends to GPS API endpoint
- **Export & Info Tab**: Download plan JSON, phase roadmap, system architecture, talking points

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

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
