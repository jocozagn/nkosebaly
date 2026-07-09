#!/usr/bin/env node
/**
 * Importe data/admin/store.json vers PostgreSQL (table app_data).
 *
 * Usage:
 *   DATABASE_URL=postgresql://nko:pass@localhost:5432/nko node scripts/migrate-json-to-postgres.mjs
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL requis");
  process.exit(1);
}

const storePath = path.join(process.cwd(), "data", "admin", "store.json");
const schemaPath = path.join(process.cwd(), "scripts", "postgres", "schema.sql");

const pool = new Pool({ connectionString: databaseUrl });

try {
  const schemaSql = await readFile(schemaPath, "utf8");
  await pool.query(schemaSql);

  const raw = await readFile(storePath, "utf8");
  const data = JSON.parse(raw);

  await pool.query(
    `INSERT INTO app_data (id, data, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id)
     DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    ["main", JSON.stringify(data)]
  );

  const count = await pool.query(`SELECT COUNT(*)::int AS n FROM app_data`);
  console.log(`Migration OK → app_data rows: ${count.rows[0]?.n ?? 0}`);
} catch (error) {
  console.error("Migration échouée:", error);
  process.exit(1);
} finally {
  await pool.end();
}
