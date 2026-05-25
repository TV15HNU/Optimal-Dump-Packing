import { Router } from "express";
import { getAuth } from "@clerk/express";
import pool from "../lib/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  req.userId = userId;
  next();
}

router.get("/v1/sites", requireAuth, async (req: any, res: any) => {
  try {
    const result = await pool.query(
      "SELECT id, name, status, truck_id, truck_name, total_spots, spots_done, created_at, updated_at FROM sites ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch sites");
    res.status(500).json({ error: "Failed to fetch sites" });
  }
});

router.get("/v1/sites/:id", requireAuth, async (req: any, res: any) => {
  try {
    const site = await pool.query("SELECT * FROM sites WHERE id=$1", [req.params.id]);
    if (site.rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    const progress = await pool.query(
      "SELECT spot_id, done, done_at, driver_id FROM spot_progress WHERE site_id=$1 ORDER BY spot_id",
      [req.params.id]
    );
    const snapshots = await pool.query(
      "SELECT spots_done, total_spots, snapshot_at FROM site_progress_snapshots WHERE site_id=$1 ORDER BY snapshot_at ASC",
      [req.params.id]
    );
    res.json({ ...site.rows[0], spotProgress: progress.rows, progressHistory: snapshots.rows });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch site");
    res.status(500).json({ error: "Failed to fetch site" });
  }
});

router.post("/v1/sites", requireAuth, async (req: any, res: any) => {
  const { id, name, truckId, truckName, polygon, gpsPolygon, plan } = req.body;
  if (!id || !name || !plan) { res.status(400).json({ error: "id, name, plan required" }); return; }
  const totalSpots = plan?.metrics?.spotCount ?? plan?.spots?.length ?? 0;
  try {
    await pool.query(
      `INSERT INTO sites (id, name, status, truck_id, truck_name, polygon, gps_polygon, plan, total_spots, spots_done)
       VALUES ($1,$2,'running',$3,$4,$5,$6,$7,$8,0)
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, truck_id=EXCLUDED.truck_id, truck_name=EXCLUDED.truck_name,
         polygon=EXCLUDED.polygon, gps_polygon=EXCLUDED.gps_polygon, plan=EXCLUDED.plan,
         total_spots=EXCLUDED.total_spots, updated_at=NOW()`,
      [id, name, truckId ?? "", truckName ?? "", JSON.stringify(polygon ?? []), JSON.stringify(gpsPolygon ?? null), JSON.stringify(plan), totalSpots]
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save site");
    res.status(500).json({ error: "Failed to save site" });
  }
});

router.patch("/v1/sites/:id/status", requireAuth, async (req: any, res: any) => {
  const { status } = req.body;
  if (!["running", "completed"].includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  try {
    if (status === "running") {
      // Reopen: clear all spot progress so demo/drivers can start fresh
      await pool.query("DELETE FROM spot_progress WHERE site_id=$1", [req.params.id]);
      await pool.query("UPDATE sites SET status='running', spots_done=0, updated_at=NOW() WHERE id=$1", [req.params.id]);
    } else {
      await pool.query("UPDATE sites SET status=$1, updated_at=NOW() WHERE id=$2", [status, req.params.id]);
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update site status");
    res.status(500).json({ error: "Failed to update status" });
  }
});

router.delete("/v1/sites/:id", requireAuth, async (req: any, res: any) => {
  try {
    await pool.query("DELETE FROM sites WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete site");
    res.status(500).json({ error: "Failed to delete site" });
  }
});

router.post("/v1/sites/:id/progress", requireAuth, async (req: any, res: any) => {
  const { spotId, done, driverId } = req.body;
  const siteId = req.params.id;
  try {
    await pool.query(
      `INSERT INTO spot_progress (site_id, spot_id, done, done_at, driver_id)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (site_id, spot_id) DO UPDATE SET done=EXCLUDED.done, done_at=EXCLUDED.done_at, driver_id=EXCLUDED.driver_id`,
      [siteId, spotId, done, done ? new Date().toISOString() : null, driverId ?? null]
    );
    const countResult = await pool.query(
      "SELECT COUNT(*) as done_count FROM spot_progress WHERE site_id=$1 AND done=true",
      [siteId]
    );
    const doneCount = parseInt(countResult.rows[0].done_count);
    await pool.query("UPDATE sites SET spots_done=$1, updated_at=NOW() WHERE id=$2", [doneCount, siteId]);
    const siteResult = await pool.query("SELECT total_spots FROM sites WHERE id=$1", [siteId]);
    const totalSpots = siteResult.rows[0]?.total_spots ?? 0;
    await pool.query(
      "INSERT INTO site_progress_snapshots (site_id, spots_done, total_spots) VALUES ($1,$2,$3)",
      [siteId, doneCount, totalSpots]
    );
    res.json({ ok: true, spotsDone: doneCount });
  } catch (err) {
    req.log.error({ err }, "Failed to update spot progress");
    res.status(500).json({ error: "Failed to update progress" });
  }
});

router.get("/v1/sites/:id/driver-view", requireAuth, async (req: any, res: any) => {
  try {
    const site = await pool.query(
      "SELECT id, name, status, truck_id, truck_name, plan, total_spots, spots_done FROM sites WHERE id=$1",
      [req.params.id]
    );
    if (site.rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    const progress = await pool.query(
      "SELECT spot_id, done FROM spot_progress WHERE site_id=$1",
      [req.params.id]
    );
    res.json({ ...site.rows[0], spotProgress: progress.rows });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch driver view");
    res.status(500).json({ error: "Failed to fetch driver view" });
  }
});

export default router;
