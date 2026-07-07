import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminLoginPage from "@/components/admin/AdminLoginPage";

export default async function AdminLoginRoute() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token")?.value;

  if (adminToken) {
    redirect("/admin/dashboard");
  }

  return <AdminLoginPage />;
}
