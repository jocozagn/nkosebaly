import { Pool } from "pg";
import { getDatabaseUrl, isPostgresEnabled } from "./config";

let pool: Pool | null = null;

/** Pool PostgreSQL partagé (lazy init). */
export const getDbPool = (): Pool | null => {
  if (!isPostgresEnabled()) return null;

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return pool;
};

/** Test rapide de connexion (health check). */
export const pingDatabase = async (): Promise<boolean> => {
  const db = getDbPool();
  if (!db) return false;

  try {
    const result = await db.query("SELECT 1 AS ok");
    return result.rows[0]?.ok === 1;
  } catch {
    return false;
  }
};
