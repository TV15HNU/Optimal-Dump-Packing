import { Pool } from "pg";
import { logger } from "./logger";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected pg pool error");
});

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_trucks (
        id              TEXT        PRIMARY KEY,
        name            TEXT        NOT NULL,
        width           NUMERIC     NOT NULL,
        length          NUMERIC     NOT NULL,
        turning_radius  NUMERIC     NOT NULL,
        spacing_x       NUMERIC     NOT NULL,
        spacing_y       NUMERIC     NOT NULL,
        payload_tonnes  NUMERIC     NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS sites (
        id           TEXT        PRIMARY KEY,
        name         TEXT        NOT NULL,
        status       TEXT        NOT NULL DEFAULT 'running',
        truck_id     TEXT        NOT NULL DEFAULT '',
        truck_name   TEXT        NOT NULL DEFAULT '',
        polygon      JSONB       NOT NULL DEFAULT '[]',
        gps_polygon  JSONB,
        plan         JSONB       NOT NULL DEFAULT '{}',
        total_spots  INTEGER     NOT NULL DEFAULT 0,
        spots_done   INTEGER     NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS spot_progress (
        id        SERIAL      PRIMARY KEY,
        site_id   TEXT        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
        spot_id   INTEGER     NOT NULL,
        done      BOOLEAN     NOT NULL DEFAULT false,
        done_at   TIMESTAMPTZ,
        driver_id TEXT,
        UNIQUE (site_id, spot_id)
      );

      CREATE TABLE IF NOT EXISTS site_progress_snapshots (
        id          SERIAL      PRIMARY KEY,
        site_id     TEXT        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
        spots_done  INTEGER     NOT NULL,
        total_spots INTEGER     NOT NULL,
        snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_spot_progress_site_id
        ON spot_progress (site_id);

      CREATE INDEX IF NOT EXISTS idx_site_progress_snapshots_site_id
        ON site_progress_snapshots (site_id);
    `);
    logger.info("Database schema initialised");
  } catch (err) {
    logger.error({ err }, "Failed to initialise database schema");
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
