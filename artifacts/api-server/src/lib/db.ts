import { Pool } from "pg";
import { logger } from "./logger";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected pg pool error");
});

export default pool;
