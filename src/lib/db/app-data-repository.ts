import type { AdminData } from "@/lib/admin/types";
import { getDbPool } from "./client";

const APP_DATA_ID = "main";

/** Lit le snapshot applicatif depuis PostgreSQL (JSONB). */
export const readAppDataFromPostgres = async (): Promise<AdminData | null> => {
  const db = getDbPool();
  if (!db) return null;

  const result = await db.query<{ data: AdminData }>(
    `SELECT data FROM app_data WHERE id = $1 LIMIT 1`,
    [APP_DATA_ID]
  );

  if (!result.rows[0]?.data) return null;
  return result.rows[0].data;
};

/** Écrit le snapshot applicatif dans PostgreSQL (upsert). */
export const writeAppDataToPostgres = async (data: AdminData): Promise<void> => {
  const db = getDbPool();
  if (!db) {
    throw new Error("PostgreSQL non configuré");
  }

  await db.query(
    `INSERT INTO app_data (id, data, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id)
     DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [APP_DATA_ID, JSON.stringify(data)]
  );
};
