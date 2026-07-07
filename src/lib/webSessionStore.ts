/**
 * Stockage en mémoire des sessions de connexion web (QR).
 * À remplacer par le backend Laravel en production.
 */

export type WebSessionStatus = "pending" | "confirmed" | "expired";

export interface WebSession {
  token: string;
  status: WebSessionStatus;
  createdAt: number;
  expiresAt: number;
  authToken?: string;
  deviceId?: string;
}

/** Durée de validité du QR en millisecondes (2 minutes) */
export const WEB_SESSION_TTL_MS = 2 * 60 * 1000;

const sessions = new Map<string, WebSession>();

/** Nettoie les sessions expirées */
const cleanupExpiredSessions = (): void => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now && session.status === "pending") {
      session.status = "expired";
      sessions.set(token, session);
    }
  }
};

/** Crée une nouvelle session QR */
export const createWebSession = (): WebSession => {
  cleanupExpiredSessions();

  const now = Date.now();
  const token = crypto.randomUUID();

  const session: WebSession = {
    token,
    status: "pending",
    createdAt: now,
    expiresAt: now + WEB_SESSION_TTL_MS,
  };

  sessions.set(token, session);
  return session;
};

/** Récupère une session par token */
export const getWebSession = (token: string): WebSession | undefined => {
  cleanupExpiredSessions();
  const session = sessions.get(token);

  if (!session) return undefined;

  if (session.status === "pending" && session.expiresAt < Date.now()) {
    session.status = "expired";
    sessions.set(token, session);
  }

  return session;
};

/** Confirme une session depuis l'app mobile */
export const confirmWebSession = (
  token: string,
  deviceId: string
): { success: boolean; message: string; authToken?: string } => {
  const session = getWebSession(token);

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
  session.deviceId = deviceId;
  session.authToken = authToken;
  sessions.set(token, session);

  return { success: true, message: "Connexion confirmée", authToken };
};
