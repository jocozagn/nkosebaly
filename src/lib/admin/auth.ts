import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

/** Nom du cookie session admin */
export const ADMIN_TOKEN_COOKIE = "admin_token";

/** Durée de validité du token admin (7 jours) */
const ADMIN_TOKEN_TTL_SEC = 7 * 24 * 60 * 60;

interface AdminSessionPayload {
  email: string;
  iat: number;
  exp: number;
}

/** Secret HMAC — obligatoire en production pour signer les sessions */
const getAdminSessionSecret = (): string | null => {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (secret && secret !== "change-me-local-dev-only" && secret !== "generez-une-chaine-aleatoire-longue") {
    return secret;
  }

  if (process.env.NODE_ENV === "production") return null;

  return "dev-admin-secret-change-me";
};

/** Crée un token admin signé (payload.exp + signature HMAC) */
export const signAdminToken = (email: string): string | null => {
  const secret = getAdminSessionSecret();
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    email,
    iat: now,
    exp: now + ADMIN_TOKEN_TTL_SEC,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
};

/** Vérifie un token admin (signature + expiration) */
export const verifyAdminToken = (token: string | undefined | null): AdminSessionPayload | null => {
  const secret = getAdminSessionSecret();
  if (!secret || !token?.includes(".")) return null;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSignature = createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  try {
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  let payload: AdminSessionPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as AdminSessionPayload;
  } catch {
    return null;
  }

  if (!payload.email || !payload.exp) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
};

/** Vérifie la session admin depuis une requête API */
export const isAdminRequest = (request: NextRequest): boolean =>
  verifyAdminToken(request.cookies.get(ADMIN_TOKEN_COOKIE)?.value) !== null;

/** Identifiants admin depuis les variables d'environnement */
export const getAdminCredentials = (): { email: string; password: string } | null => {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
};
