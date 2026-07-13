import { getStudentAuthSessionByToken } from "@/lib/admin/store";
import { clearStudentWebCookies } from "@/lib/auth/student-web-session";
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
    // Cookie auth présent mais session révoquée (connexion sur un autre appareil)
    await clearStudentWebCookies();
  }

  return <QrLoginPage />;
}
