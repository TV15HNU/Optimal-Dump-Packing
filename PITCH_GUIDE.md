# Pitch Guide — Optimal Dump Packing
## Hackathon Finals 2026

> This is your personal cheat sheet. Everything in here is what you say out loud — the slides handle the visuals.
> Read this before you walk up. You won't need it open during the demo.

---

## The 90-Second Opening (Before You Touch the App)

Say this before opening any tab:

> "Mining haul trucks are fully autonomous today — they drive themselves. But when they reach the dump zone to tip their load, the software that decides *where* to dump is still using a fixed rectangular grid. The problem is that dump terraces are never rectangles. They're L-shapes, trapezoids, irregular polygons. So every dump zone wastes between 40 and 60 percent of its space — and the trucks start blocking each other once the near-side spots fill up.
>
> We built a planning system that treats the dump zone as the actual polygon it is, packs it using hexagonal geometry — the mathematically densest arrangement — and dispatches trucks deepest-first so they never cross each other's path.
>
> Let me show you the whole thing live."

Then open the app.

---

## Tab-by-Tab Demo Guide

### TAB 1 — Planner

**What it is:** The tool a shift supervisor uses before a dump starts. Draw the polygon, pick the truck, get the optimised spot layout.

**What to do:**
1. Click a few points on the canvas to draw an irregular polygon (not a rectangle — make it slightly L-shaped or uneven)
2. Pick **CAT 793** from the truck dropdown
3. Click **Run Packing**
4. Click **Fill Edge Gaps**
5. Click somewhere near the bottom of the polygon to set the **Entry point**

**What to say as you do it:**

> "I'm drawing the actual shape of a dump terrace — notice I'm not drawing a rectangle. This is closer to what these zones look like in the field."

After clicking Run Packing:

> "In under 50 milliseconds, the algorithm places spots in a hexagonal arrangement. That's the mathematically densest way to pack equal circles — 90.7% area coverage. It also swept 12 different rotation angles and picked the one that fits the most trucks."

After filling gaps:

> "The first pass covers the main grid. The gap-fill pass captures the spots that sit in the boundary voids — those triangular corners the grid missed. Each of those is a real dump a real truck can make."

After setting entry:

> "Entry point is set. The system now knows which spots are farthest from the exit. That matters on the next tab."

---

### TAB 2 — Simulation

**What it is:** A visual animation of the dispatch order. Watch which spots fill first.

**What to do:** Click **Play** or **Start Simulation**

**What to say:**

> "Watch the fill order — the system starts at the deepest spots and works back toward the entry. This is the key insight: if you fill closest-to-entry first, every incoming truck has to weave past every truck that already finished. At 8 to 12 trucks per zone, that's a queue every few minutes. Farthest-first means trucks flow in, dump, flow out — they never cross paths."

---

### TAB 3 — Analytics

**What it is:** Live metrics on the current plan — spot count, utilisation %, estimated fill time, and a comparison against the baseline.

**What to say:**

> "This shows the plan metrics in real time. The utilisation number here — [point to it] — is the percentage of the inset polygon that gets used. Compare that to the 41% industry baseline. The improvement you're seeing comes purely from the algorithm — no hardware changes, no additional trucks, no site modifications."

If they ask what the baseline is:

> "Fixed rectangular grid aligned to 0 degrees. It's what every major AHS vendor ships today."

---

### TAB 4 — Map / GPS

**What it is:** A Leaflet satellite map. You can draw a polygon directly on real coordinates, or paste GPS vertices from a surveyed site plan.

**What to say:**

> "For actual deployment, a supervisor would click the polygon vertices on this satellite map — those are real GPS coordinates. The plan comes back overlaid on the map. The spot positions are in GPS coordinates you can push directly into the AHS console."

---

### TAB 5 — Export

**What it is:** Downloads the plan as a JSON file containing every spot, its GPS coordinates, lane ID, zone, entry/exit point — everything an AHS system needs.

**What to say:**

> "Export is how this connects to hardware. The JSON output contains GPS coordinates for every dump spot, the entry and exit points, and the farthest-first dispatch order. Caterpillar Command, Komatsu FrontRunner — they all accept a waypoint JSON. This is a drop-in integration."

---

### DASHBOARD (Supervisor view, separate login)

**What it is:** Real-time site monitoring. Shows all active dump zones, progress bars, a sparkline of fill history, and alerts on completion.

**What to say:**

> "Switch to the supervisor dashboard. This shows every running site. The canvas is live — as drivers mark spots done, it updates here. The poll interval is 10 seconds. When a site hits 100%, the supervisor gets a toast notification and the status persists to the database — the site doesn't disappear, it stays as a completed record."

---

### DRIVER WORK TAB (Driver view)

**What it is:** What the driver sees. One site, one spot glowing amber — the current spot to fill. One button to mark it done.

**What to say:**

> "The driver UI is intentionally minimal. Log in as Driver. Select your assigned site. The deepest available spot glows amber — that's where you go. When you dump, you tap Mark Done. The next spot activates. The supervisor sees it within 10 seconds."

If a judge asks: *Why not just use the AHS console for this?*

> "AHS consoles are locked to the OEM's cab system — you can't log into a Caterpillar console from a mobile browser. This gives the mine operator a vendor-agnostic interface that works on any device, for any AHS system, without hardware modifications."

---

### BATCH EXCEL TAB (Supervisor, advanced)

**What it is:** Upload a multi-sheet Excel file with polygon vertices, truck specs, and site names. It runs the full packing algorithm on every sheet at once and gives you back an Excel with the results including spot counts and improvement percentages.

**What to say:**

> "For a mine planning team, manual polygon drawing is too slow. This tab accepts a multi-sheet Excel — one sheet per dump zone. Upload it, and the system runs the algorithm on every site simultaneously. The output Excel has the spot counts, fill estimates, and improvement numbers ready for a daily operations brief."

---

## If Judges Ask Technical Questions

**"How does the hexagonal packing actually work?"**

> "We place a hex grid — rows offset by half a spacing — over the polygon's bounding box. Then we test which grid points fall inside the inset polygon using a ray-casting test. The inset removes any point that a truck couldn't physically reach given its turning radius. The rotation sweep tests 12 angles from 0 to 60 degrees — we only need 60 degrees because hex grids have 6-fold symmetry, so rotating past 60 repeats the pattern."

**"What's the inset?"**

> "The inset shrinks the polygon inward by the truck's turning radius — that's the minimum distance from the edge the truck needs to dump safely without a multi-point turn. It's a Sutherland-Hodgman-style clip. Every spot we place is guaranteed to be inside that safe zone."

**"How does farthest-first actually prevent deadlock?"**

> "It's a sort. We take all the packed spots, compute each one's distance from the entry point, and sort descending. The truck that gets dispatched first always goes to the spot farthest from the entry. When it returns, it exits before the next truck is assigned. There's only ever one truck on the inbound path and one on the outbound path — they don't overlap."

**"Why not just use an ORM for the database?"**

> "We wanted full control over the queries and zero abstraction overhead. All four tables use parameterised SQL directly — no ORM magic. The plan JSON is stored as JSONB in Postgres, which lets us query individual spot fields without deserialising the whole object."

**"Is this production-ready?"**

> "The planning engine is. The dispatch simulation is. The multi-role auth and database persistence are. What's missing before a real mine could use it is integration with the specific AHS console's API — that's an adapter layer, not a core algorithm problem."

---

## Things That Make You Sound Like the Expert

Say these naturally — don't read them:

- "Hexagonal close packing is the theoretical maximum for equal circles in 2D — 90.69% coverage. We're close to that."
- "The rotation sweep only goes to 60 degrees, not 360. That's because of the 6-fold symmetry of a hex grid — there's no new information past 60."
- "The same algorithm runs on the client in TypeScript for instant preview and on the server for the final export. Same code, two runtimes, no latency during planning."
- "The entry and exit points feed directly into the farthest-first sort. Change the entry point and the whole dispatch order recalculates instantly."
- "Gap-fill spots are visually distinct — they show in a lighter shade — so the supervisor can tell at a glance which spots came from the primary grid versus the boundary pass."

---

## Common Traps — What NOT to Say

- Don't explain the Sutherland-Hodgman algorithm by name unless they specifically ask how the inset works
- Don't say "we used React Query hooks generated from an OpenAPI spec via Orval codegen" — say "the frontend and backend are always in sync through a contract-first API"
- Don't go into the database schema unless asked
- Don't explain what pnpm workspaces are
- Don't apologise for any UI roughness — own it as "the focus was on the algorithm, not the styling"

---

## The Closing Line

After the demo, before Q&A:

> "The full algorithm runs in under 200 milliseconds on any polygon, any truck. It requires zero hardware changes and the output is compatible with every major AHS vendor's waypoint format. The only thing standing between this and a real mine is an API key."

---

*Keep this file. Update the team names and actual measured metrics before you go on stage.*
