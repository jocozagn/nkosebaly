import { NextRequest } from "next/server";

/** URL publique de la requête (IP/domaine réel utilisé par le client) */
export const getRequestBaseUrl = (request: NextRequest): string => {
  // Priorité : variable dédiée mobile, puis header client, puis host de la requête
  const mobileBase = process.env.MOBILE_API_BASE_URL?.replace(/\/$/, "");
  if (mobileBase) return mobileBase;

  const clientBase = request.headers.get("x-api-base")?.replace(/\/$/, "");
  if (clientBase) return clientBase;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) {
    return (process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3001").replace(/\/$/, "");
  }

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`.replace(/\/$/, "");
};
