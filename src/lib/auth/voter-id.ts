import { createHash } from "crypto";

/** Identifiant anonyme stable pour like / question (dérivé du cookie auth) */
export const getVoterIdFromToken = (authToken: string): string =>
  createHash("sha256").update(authToken).digest("hex").slice(0, 24);

/** Identifiant anonyme stable pour l'app mobile (dérivé du device_id) */
export const getVoterIdFromDeviceId = (deviceId: string): string =>
  createHash("sha256").update(`device:${deviceId}`).digest("hex").slice(0, 24);
