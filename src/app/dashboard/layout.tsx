import type { ReactNode } from "react";
import { requireValidStudentWebSession } from "@/lib/auth/student-web-session";

export const dynamic = "force-dynamic";

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Valide la session web côté serveur avant d'afficher le dashboard.
 * Évite de rester bloqué sur activate-license quand le cookie auth est obsolète
 * (connexion QR effectuée sur un autre navigateur / PC).
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  await requireValidStudentWebSession();
  return children;
}
