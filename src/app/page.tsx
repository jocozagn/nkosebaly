import { getStudentAuthSessionByToken } from "@/lib/admin/store";
import { STALE_SESSION_CLEAR_PATH } from "@/lib/auth/student-web-session";
import { getAuthToken } from "@/utils/cookies";
import { redirect } from "next/navigation";
import QrLoginPage from "@/components/nko/QrLoginPage";

export const dynamic = "force-dynamic";

/** Page d'accueil : connexion par QR code uniquement */
export default async function Home() {
  const authToken = await getAuthToken();

  if (authToken) {
    const session = await getStudentAuthSessionByToken(authToken);
    if (session) {
      redirect("/dashboard");
    }
    // Cookie auth présent mais session révoquée → effacement via Route Handler
    redirect(STALE_SESSION_CLEAR_PATH);
  }

  return <QrLoginPage />;
}
