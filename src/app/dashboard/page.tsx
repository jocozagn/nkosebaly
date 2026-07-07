import { isAuthenticated } from "@/utils/cookies";
import { redirect } from "next/navigation";
import NkoDashboardPage from "@/components/nko/NkoDashboardPage";

/** Tableau de bord étudiant N'ko */
export default async function DashboardPage() {
  const authed = await isAuthenticated();

  if (!authed) {
    redirect("/");
  }

  return <NkoDashboardPage />;
}
