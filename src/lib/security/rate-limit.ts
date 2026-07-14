import { NextRequest, NextResponse } from "next/server";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

/** Fenêtre glissante en mémoire (instance PM2 unique). */
const buckets = new Map<string, RateLimitBucket>();

const pruneExpiredBuckets = (): void => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

/** Extrait l'IP client (proxy Nginx compatible). */
export const getClientIp = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
};

interface RateLimitOptions {
  /** Identifiant logique (ex. admin-login, license-activate) */
  scope: string;
  /** Nombre max de requêtes par fenêtre */
  limit: number;
  /** Durée fenêtre en ms */
  windowMs: number;
}

/**
 * Limite le débit par IP + scope.
 * Retourne une réponse 429 prête à envoyer, ou null si autorisé.
 */
export const checkRateLimit = (
  request: NextRequest,
  options: RateLimitOptions
): NextResponse | null => {
  if (buckets.size > 5000) pruneExpiredBuckets();

  const ip = getClientIp(request);
  const key = `${options.scope}:${ip}`;
  const now = Date.now();

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (current.count >= options.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      {
        error: true,
        message: "Trop de tentatives. Réessayez dans quelques minutes.",
        code: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  current.count += 1;
  return null;
};
