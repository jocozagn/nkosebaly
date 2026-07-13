import { redirect } from "next/navigation";
import { getStudentAuthSessionByToken } from "@/lib/admin/store";
import { getAuthToken } from "@/utils/cookies";

/** Route qui efface les cookies obsolètes (Route Handler autorisé par Next.js) */
export const STALE_SESSION_CLEAR_PATH = "/api/auth/clear-stale-session";

/**
 * Vérifie que le cookie auth_token correspond encore à une session serveur active.
 * Si la connexion a été faite ailleurs, redirection vers clear-stale-session.
 */
export const requireValidStudentWebSession = async (): Promise<string> => {
  const authToken = await getAuthToken();
  if (!authToken) {
    redirect("/");
  }

  const session = await getStudentAuthSessionByToken(authToken);
  if (!session) {
    redirect(STALE_SESSION_CLEAR_PATH);
  }

  return authToken;
};
