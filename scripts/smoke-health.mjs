#!/usr/bin/env node
/**
 * Smoke test — vérifie que /api/health répond OK.
 * Usage CI : node scripts/smoke-health.mjs [baseUrl]
 */

const baseUrl = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3001").replace(
  /\/$/,
  ""
);

const res = await fetch(`${baseUrl}/api/health`);
const json = await res.json().catch(() => null);

if (!res.ok || !json?.data) {
  console.error(`Health check FAILED (${res.status})`, json);
  process.exit(1);
}

const { status, data_store, postgres } = json.data;
if (status !== "ok") {
  console.error("Health status not ok:", json.data);
  process.exit(1);
}

if (data_store === "postgres" && postgres?.enabled && postgres?.connected !== true) {
  console.error("PostgreSQL enabled but not connected:", postgres);
  process.exit(1);
}

console.log(
  `Health OK — status=${status}, store=${data_store}, postgres=${postgres?.connected ?? "n/a"}`
);
process.exit(0);
