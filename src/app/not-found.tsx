"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft } from "lucide-react";
import NkoShell from "@/components/nko/NkoShell";

/** Page 404 — design Balandou Wourouki Digital */
export default function NotFound() {
  const router = useRouter();

  const handleGoBack = (): void => {
    router.back();
  };

  return (
    <NkoShell showNav={false}>
      <div className="flex items-center justify-center px-4 py-16 md:py-24">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-lg shadow-sm border border-[#e8ddd4] p-8 md:p-10">
            {/* Code erreur */}
            <p
              className="text-6xl md:text-7xl font-bold mb-2"
              style={{ color: "var(--brand-brown)" }}
              aria-hidden="true"
            >
              404
            </p>

            <div className="h-1 w-16 mx-auto mb-6 bg-[var(--brand-gold)]" aria-hidden="true" />

            <h1 className="text-xl md:text-2xl font-bold mb-2" style={{ color: "var(--brand-black)" }}>
              Page introuvable
            </h1>
            <p className="text-sm mb-8" style={{ color: "var(--brand-gray)" }}>
              La page que vous cherchez n&apos;existe pas ou a été déplacée.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--brand-brown)" }}
                aria-label="Retour à l'accueil"
              >
                <Home className="w-4 h-4" />
                Accueil
              </Link>
              <button
                type="button"
                onClick={handleGoBack}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded border transition-colors hover:bg-[var(--brand-bg)]"
                style={{
                  color: "var(--brand-brown)",
                  borderColor: "var(--brand-brown)",
                }}
                aria-label="Retour à la page précédente"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
            </div>
          </div>
        </div>
      </div>
    </NkoShell>
  );
}
