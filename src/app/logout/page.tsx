"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Déconnexion étudiant — supprime le cookie et redirige */
export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" })
      .catch(() => null)
      .finally(() => {
        router.replace("/");
      });
  }, [router]);

  return null;
}
