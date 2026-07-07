import { isAuthenticated } from "@/utils/cookies";
import { redirect } from "next/navigation";
import QrLoginPage from "@/components/nko/QrLoginPage";

/** Page d'accueil : connexion par QR code uniquement */
export default async function Home() {
  const authed = await isAuthenticated();

  if (authed) {
    redirect("/dashboard");
  }

  return <QrLoginPage />;
}
