import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStudentAuthSessionByToken } from "@/lib/admin/store";
import {
  DEVICE_COOKIE,
  LICENSE_COOKIE,
  PROFILE_COOKIE,
} from "@/lib/license/cookies";
import { getAuthToken } from "@/utils/cookies";

/** Supprime tous les cookies de session web étudiant (composants serveur) */
export const clearStudentWebCookies = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  cookieStore.delete(LICENSE_COOKIE);
  cookieStore.delete(DEVICE_COOKIE);
  cookieStore.delete(PROFILE_COOKIE);
};

/**
 * Vérifie que le cookie auth_token correspond encore à une session serveur active.
 * Si la connexion a été faite ailleurs, l'ancienne session est supprimée côté serveur :
 * on efface les cookies locaux et on renvoie vers le QR de connexion.
 */
export const requireValidStudentWebSession = async (): Promise<string> => {
  const authToken = await getAuthToken();
  if (!authToken) {
    redirect("/");
  }

  const session = await getStudentAuthSessionByToken(authToken);
  if (!session) {
    await clearStudentWebCookies();
    redirect("/");
  }

  return authToken;
};
