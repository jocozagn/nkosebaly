/** Configuration Djomy — variables d'environnement serveur uniquement */
export interface DjomyConfig {
  clientId: string;
  clientSecret: string;
  partnerDomain: string;
  baseUrl: string;
  webUrl: string;
}

/** Lit la config Djomy ; lève une erreur si une variable obligatoire manque */
export const getDjomyConfig = (): DjomyConfig => {
  const clientId = process.env.DJOMY_CLIENT_ID;
  const clientSecret = process.env.DJOMY_CLIENT_SECRET;
  const partnerDomain = process.env.DJOMY_PARTNER_DOMAIN;
  const baseUrl =
    process.env.DJOMY_BASE_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://api.djomy.africa"
      : "https://sandbox-api.djomy.africa");
  const webUrl = (process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3001").replace(/\/$/, "");

  if (!clientId || !clientSecret || !partnerDomain) {
    throw new Error("Configuration Djomy manquante (DJOMY_CLIENT_ID, DJOMY_CLIENT_SECRET, DJOMY_PARTNER_DOMAIN)");
  }

  return { clientId, clientSecret, partnerDomain, baseUrl, webUrl };
};

/** Vérifie si Djomy est configuré sans lever d'exception */
export const isDjomyConfigured = (): boolean =>
  Boolean(process.env.DJOMY_CLIENT_ID && process.env.DJOMY_CLIENT_SECRET && process.env.DJOMY_PARTNER_DOMAIN);
