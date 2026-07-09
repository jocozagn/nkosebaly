/**
 * Sessions de connexion web (QR).
 * Mémoire par défaut ; PostgreSQL si DATA_STORE=postgres (survit aux redémarrages PM2).
 */

import { isPostgresEnabled } from "@/lib/db/config";
import {
  cleanupExpiredWebSessions,
  fetchWebSession,
  insertWebSession,
  updateWebSession,
} from "@/lib/db/web-session-repository";

export type WebSessionStatus = "pending" | "confirmed" | "expired";

export interface WebSession {
  token: string;
  status: WebSessionStatus;
  createdAt: number;
  expiresAt: number;
  authToken?: string;
  /** device_id enregistré sur la carte licence (pour lier la session web) */
  deviceId?: string;
  /** Carte licence confirmée depuis l'app mobile (via X-Mobile-Token) */
  licenseCardId?: string;
}

/** Durée de validité du QR en millisecondes (2 minutes) */
export const WEB_SESSION_TTL_MS = 2 * 60 * 1000;

const sessions = new Map<string, WebSession>();

const cleanupExpiredSessionsMemory = (): void => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now && session.status === "pending") {
      session.status = "expired";
      sessions.set(token, session);
    }
  }
};

const getWebSessionMemory = (token: string): WebSession | undefined => {
  cleanupExpiredSessionsMemory();
  const session = sessions.get(token);
  if (!session) return undefined;

  if (session.status === "pending" && session.expiresAt < Date.now()) {
    session.status = "expired";
    sessions.set(token, session);
  }

  return session;
};

const persistSession = async (session: WebSession): Promise<void> => {
  if (!isPostgresEnabled()) return;
  await updateWebSession(session);
};

/** Crée une nouvelle session QR */
export const createWebSession = async (): Promise<WebSession> => {
  if (isPostgresEnabled()) {
    await cleanupExpiredWebSessions(Date.now());
  } else {
    cleanupExpiredSessionsMemory();
  }

  const now = Date.now();
  const token = crypto.randomUUID();

  const session: WebSession = {
    token,
    status: "pending",
    createdAt: now,
    expiresAt: now + WEB_SESSION_TTL_MS,
  };

  sessions.set(token, session);
  await insertWebSession(session);
  return session;
};

/** Récupère une session par token */
export const getWebSession = async (token: string): Promise<WebSession | undefined> => {
  if (isPostgresEnabled()) {
    const fromDb = await fetchWebSession(token);
    if (fromDb) {
      if (fromDb.status === "pending" && fromDb.expiresAt < Date.now()) {
        fromDb.status = "expired";
        await persistSession(fromDb);
      }
      sessions.set(token, fromDb);
      return fromDb;
    }
  }

  return getWebSessionMemory(token);
};

export interface ConfirmWebSessionInput {
  deviceId: string;
  licenseCardId: string;
}

/** Confirme une session depuis l'app mobile (licence déjà validée côté API) */
export const confirmWebSession = async (
  token: string,
  input: ConfirmWebSessionInput
): Promise<{ success: boolean; message: string; authToken?: string }> => {
  const session = await getWebSession(token);

  if (!session) {
    return { success: false, message: "Session introuvable" };
  }

  if (session.status === "expired") {
    return { success: false, message: "QR code expiré" };
  }

  if (session.status === "confirmed") {
    return {
      success: true,
      message: "Session déjà confirmée",
      authToken: session.authToken,
    };
  }

  const authToken = crypto.randomUUID();
  session.status = "confirmed";
  session.deviceId = input.deviceId;
  session.licenseCardId = input.licenseCardId;
  session.authToken = authToken;
  sessions.set(token, session);
  await persistSession(session);

  return { success: true, message: "Connexion confirmée", authToken };
};
