import type { WebSession, WebSessionStatus } from "@/lib/webSessionStore";
import { getDbPool } from "./client";

interface WebSessionRow {
  token: string;
  status: WebSessionStatus;
  created_at: string;
  expires_at: string;
  auth_token: string | null;
  device_id: string | null;
  license_card_id: string | null;
}

const mapRowToSession = (row: WebSessionRow): WebSession => ({
  token: row.token,
  status: row.status,
  createdAt: Number(row.created_at),
  expiresAt: Number(row.expires_at),
  authToken: row.auth_token ?? undefined,
  deviceId: row.device_id ?? undefined,
  licenseCardId: row.license_card_id ?? undefined,
});

/** Crée une session QR en base (survit aux redémarrages PM2). */
export const insertWebSession = async (session: WebSession): Promise<void> => {
  const db = getDbPool();
  if (!db) return;

  await db.query(
    `INSERT INTO web_sessions (
      token, status, created_at, expires_at, auth_token, device_id, license_card_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (token) DO UPDATE SET
      status = EXCLUDED.status,
      expires_at = EXCLUDED.expires_at,
      auth_token = EXCLUDED.auth_token,
      device_id = EXCLUDED.device_id,
      license_card_id = EXCLUDED.license_card_id`,
    [
      session.token,
      session.status,
      session.createdAt,
      session.expiresAt,
      session.authToken ?? null,
      session.deviceId ?? null,
      session.licenseCardId ?? null,
    ]
  );
};

/** Récupère une session QR par token. */
export const fetchWebSession = async (token: string): Promise<WebSession | null> => {
  const db = getDbPool();
  if (!db) return null;

  const result = await db.query<WebSessionRow>(
    `SELECT token, status, created_at, expires_at, auth_token, device_id, license_card_id
     FROM web_sessions WHERE token = $1 LIMIT 1`,
    [token]
  );

  if (!result.rows[0]) return null;
  return mapRowToSession(result.rows[0]);
};

/** Met à jour le statut d'une session QR. */
export const updateWebSession = async (session: WebSession): Promise<void> => {
  await insertWebSession(session);
};

/** Supprime les sessions QR expirées (nettoyage périodique). */
export const cleanupExpiredWebSessions = async (nowMs: number): Promise<void> => {
  const db = getDbPool();
  if (!db) return;

  await db.query(`DELETE FROM web_sessions WHERE expires_at < $1`, [nowMs]);
};
