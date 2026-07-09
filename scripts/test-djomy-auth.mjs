#!/usr/bin/env node
/**
 * Teste la connexion Djomy (auth API).
 * Usage: node scripts/test-djomy-auth.mjs
 */

import crypto from "node:crypto";

const clientId = process.env.DJOMY_CLIENT_ID?.trim();
const clientSecret = process.env.DJOMY_CLIENT_SECRET?.trim();
const partnerDomain = process.env.DJOMY_PARTNER_DOMAIN?.trim();
const baseUrl =
  process.env.DJOMY_BASE_URL?.trim() ??
  (process.env.NODE_ENV === "production"
    ? "https://api.djomy.africa"
    : "https://sandbox-api.djomy.africa");

if (!clientId || !clientSecret || !partnerDomain) {
  console.error("Variables DJOMY_* manquantes");
  process.exit(1);
}

const signature = crypto.createHmac("sha256", clientSecret).update(clientId).digest("hex");

const response = await fetch(`${baseUrl}/v1/auth`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-KEY": `${clientId}:${signature}`,
    "X-PARTNER-DOMAIN": partnerDomain,
  },
});

const body = await response.text();
console.log(`Base URL: ${baseUrl}`);
console.log(`HTTP ${response.status}`);
console.log(body.slice(0, 500));

if (!response.ok) process.exit(1);
