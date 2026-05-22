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

router.get("/v1/trucks", requireAuth, async (req: any, res: any) => {
  try {
    const result = await pool.query(
      "SELECT * FROM custom_trucks ORDER BY created_at ASC"
    );
    const trucks = result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      width: Number(r.width),
      length: Number(r.length),
      turningRadius: Number(r.turning_radius),
      spacingX: Number(r.spacing_x),
      spacingY: Number(r.spacing_y),
      payloadTonnes: Number(r.payload_tonnes),
    }));
    res.json(trucks);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch trucks");
    res.status(500).json({ error: "Failed to fetch trucks" });
  }
});

router.post("/v1/trucks", requireAuth, async (req: any, res: any) => {
  const { id, name, width, length, turningRadius, spacingX, spacingY, payloadTonnes } = req.body;
  if (!id || !name) { res.status(400).json({ error: "id and name required" }); return; }
  try {
    await pool.query(
      `INSERT INTO custom_trucks (id, name, width, length, turning_radius, spacing_x, spacing_y, payload_tonnes, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, width=EXCLUDED.width, length=EXCLUDED.length,
         turning_radius=EXCLUDED.turning_radius, spacing_x=EXCLUDED.spacing_x,
         spacing_y=EXCLUDED.spacing_y, payload_tonnes=EXCLUDED.payload_tonnes,
         updated_at=NOW()`,
      [id, name, width, length, turningRadius, spacingX, spacingY, payloadTonnes]
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save truck");
    res.status(500).json({ error: "Failed to save truck" });
  }
});

router.delete("/v1/trucks/:id", requireAuth, async (req: any, res: any) => {
  try {
    await pool.query("DELETE FROM custom_trucks WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete truck");
    res.status(500).json({ error: "Failed to delete truck" });
  }
});

export default router;
