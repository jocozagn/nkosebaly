import { NextRequest, NextResponse } from "next/server";
import { clearStudentWebSessionCookies } from "@/lib/license/cookies";

/**
 * Efface les cookies étudiant obsolètes puis redirige vers l'accueil (QR login).
 * Utilisé quand auth_token existe mais la session serveur a été révoquée.
 */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const response = NextResponse.redirect(new URL("/", req.url));
  clearStudentWebSessionCookies(response);
  return response;
};
