#!/usr/bin/env node
/**
 * Met à jour les tarifs licence dans PostgreSQL (settings.license_plans).
 * Ne modifie pas les autres paramètres admin.
 *
 * Usage sur le VPS :
 *   cd /var/www/NKO && node scripts/patch-license-pricing.mjs
 */

import pg from "pg";

const { Pool } = pg;

/** Grille tarifaire KARAMOO SEEBALI (GNF) */
const LICENSE_PLANS = [
  { id: "plan-1m", duration_months: 1, price_gnf: 50_000, active: true },
  { id: "plan-2m", duration_months: 2, price_gnf: 80_000, active: true },
  { id: "plan-3m", duration_months: 3, price_gnf: 120_000, active: true },
  { id: "plan-6m", duration_months: 6, price_gnf: 170_000, active: true },
  { id: "plan-12m", duration_months: 12, price_gnf: 300_000, active: true },
];

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL requis");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  const result = await pool.query(`SELECT data FROM app_data WHERE id = $1 LIMIT 1`, ["main"]);
  const data = result.rows[0]?.data;

  if (!data?.settings) {
    console.error("app_data.main introuvable ou sans settings");
    process.exit(1);
  }

  data.settings.license_plans = LICENSE_PLANS;
  data.settings.license_price = 120_000;
  data.settings.license_duration_months = 3;

  await pool.query(
    `UPDATE app_data SET data = $2::jsonb, updated_at = NOW() WHERE id = $1`,
    ["main", JSON.stringify(data)]
  );

  console.log("Tarifs licence mis à jour :");
  for (const plan of LICENSE_PLANS) {
    console.log(`  ${plan.duration_months} mois → ${plan.price_gnf.toLocaleString("fr-GN")} GNF`);
  }
} catch (error) {
  console.error("Patch échoué:", error);
  process.exit(1);
} finally {
  await pool.end();
}
