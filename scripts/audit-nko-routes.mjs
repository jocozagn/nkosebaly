#!/usr/bin/env node
/**
 * Vérifie que les routes API NKO essentielles existent (régression CI).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/app/api/health/route.ts",
  "src/app/api/webhooks/djomy/route.ts",
  "src/app/api/mobile/certificates/route.ts",
  "src/app/api/mobile/certificates/pay/route.ts",
  "src/app/api/mobile/profile/route.ts",
  "src/app/api/certificates/pay/route.ts",
  "src/app/get-app/route.ts",
];

const missing = required.filter((rel) => !fs.existsSync(path.join(root, rel)));

if (missing.length > 0) {
  console.error("Routes NKO manquantes:");
  for (const m of missing) console.error(`  - ${m}`);
  process.exit(1);
}

console.log(`OK — ${required.length} routes NKO présentes`);
