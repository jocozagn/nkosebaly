import { isAuthenticated } from "@/utils/cookies";
import { redirect } from "next/navigation";
import ProfilePage from "@/components/nko/ProfilePage";

/** Profil étudiant modifiable depuis le dashboard web. */
export default async function DashboardProfilePage() {
  const authed = await isAuthenticated();

  if (!authed) {
    redirect("/");
  }

  return <ProfilePage />;
}
