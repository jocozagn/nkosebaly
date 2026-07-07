import { createHash } from "crypto";

/** Identifiant anonyme stable pour like / question (dérivé du cookie auth) */
export const getVoterIdFromToken = (authToken: string): string =>
  createHash("sha256").update(authToken).digest("hex").slice(0, 24);
