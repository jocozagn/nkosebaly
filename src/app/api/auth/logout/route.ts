import { NextResponse } from "next/server";
import { clearStudentWebSessionCookies } from "@/lib/license/cookies";

/** Déconnexion étudiant — supprime les cookies de session */
export const POST = async (): Promise<NextResponse> => {
  const response = NextResponse.json({ error: false, message: "Déconnecté" });
  clearStudentWebSessionCookies(response);
  return response;
};
