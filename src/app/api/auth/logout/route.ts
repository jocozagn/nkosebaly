import { NextResponse } from "next/server";
import { DEVICE_COOKIE, LICENSE_COOKIE } from "@/lib/license/require-license";

/** Déconnexion étudiant — supprime les cookies de session */
export const POST = async (): Promise<NextResponse> => {
  const response = NextResponse.json({ error: false, message: "Déconnecté" });
  const clear = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, maxAge: 0, path: "/" };

  response.cookies.set("auth_token", "", clear);
  response.cookies.set(LICENSE_COOKIE, "", clear);
  response.cookies.set(DEVICE_COOKIE, "", clear);
  return response;
};
