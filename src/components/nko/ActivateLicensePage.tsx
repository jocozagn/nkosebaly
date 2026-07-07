"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CreditCard, Loader2, ScanLine } from "lucide-react";
import toast from "react-hot-toast";
import NkoShell from "./NkoShell";
import BrandLoader from "@/components/ui/BrandLoader";
import { StudentProfileFields, defaultProfile, type StudentProfileFormData } from "./StudentProfileFields";
import { BRAND } from "@/constants/brand";
import { triggerNavigationStart } from "@/utils/navigation";

interface LicenseInfo {
  active: boolean;
  expires_at?: string;
  duration_months?: number;
  code_text?: string;
}

/** Activation carte PVC + collecte du profil élève */
const ActivateLicensePage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [qrData, setQrData] = useState("");
  const [profile, setProfile] = useState<StudentProfileFormData>(defaultProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDevActivating, setIsDevActivating] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [license, setLicense] = useState<LicenseInfo | null>(null);

  const isDevMode =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true";

  const checkLicense = async (): Promise<void> => {
    setIsChecking(true);
    await fetch("/api/license/status", { method: "POST" });

    const res = await fetch("/api/license/status");
    const result = await res.json();
    setIsChecking(false);

    if (!result.error && result.data?.active) {
      setLicense(result.data);
      if (pathname === "/dashboard/activate-license") {
        triggerNavigationStart();
        router.replace("/dashboard");
      }
    }
  };

  useEffect(() => {
    checkLicense();
  }, []);

  /** En mode dev : activation automatique si pas encore de licence */
  useEffect(() => {
    if (!isDevMode || isChecking || license?.active) return;

    const autoDevActivate = async (): Promise<void> => {
      await fetch("/api/license/status", { method: "POST" });
      const res = await fetch("/api/license/dev-activate", { method: "POST" });
      const result = await res.json();

      if (!result.error) {
        toast.success(`Licence test activée (${result.data?.code_text ?? ""})`);
        triggerNavigationStart();
        router.replace("/dashboard");
      }
    };

    void autoDevActivate();
  }, [isDevMode, isChecking, license?.active, router]);

  const handleProfileChange = (field: keyof StudentProfileFormData, value: string): void => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleActivate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const raw = qrData.trim();
    if (!raw) {
      toast.error("Collez le contenu du QR code");
      return;
    }

    setIsSubmitting(true);
    try {
      await fetch("/api/license/status", { method: "POST" });
      const res = await fetch("/api/license/activate-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_data: raw, ...profile }),
      });
      const result = await res.json();

      if (result.error) {
        toast.error(result.message ?? "Activation échouée");
        return;
      }

      toast.success("Licence activée !");
      triggerNavigationStart();
      router.replace("/dashboard");
    } catch {
      toast.error("Connexion au serveur impossible");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevActivate = async (): Promise<void> => {
    setIsDevActivating(true);
    try {
      await fetch("/api/license/status", { method: "POST" });
      const res = await fetch("/api/license/dev-activate", { method: "POST" });
      const result = await res.json();

      if (result.error) {
        toast.error(result.message ?? "Échec");
        return;
      }

      toast.success(`Carte test activée (${result.data?.code_text ?? ""})`);
      triggerNavigationStart();
      router.replace("/dashboard");
    } catch {
      toast.error("Connexion au serveur impossible");
    } finally {
      setIsDevActivating(false);
    }
  };

  if (isChecking) {
    return (
      <NkoShell>
        <BrandLoader variant="inline" message="Vérification de votre licence..." />
      </NkoShell>
    );
  }

  if (license?.active) {
    return (
      <NkoShell>
        <BrandLoader variant="inline" message="Redirection vers vos cours..." />
      </NkoShell>
    );
  }

  return (
    <NkoShell>
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white rounded-lg border border-[#e8ddd4] p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--brand-brown)" }}
            >
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--brand-brown)" }}>
                Activer votre carte
              </h1>
              <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
                Licence PVC + vos informations personnelles
              </p>
            </div>
          </div>

          <div className="h-1 w-16 mb-6 bg-[var(--brand-gold)]" aria-hidden="true" />

          <form onSubmit={handleActivate} className="space-y-6">
            <StudentProfileFields
              values={profile}
              onChange={handleProfileChange}
              disabled={isSubmitting}
            />

            <div className="border-t border-[#f0e8df] pt-6 space-y-4">
              <ol className="space-y-2 text-sm" style={{ color: "var(--brand-gray-dark)" }}>
                {[
                  "Scannez le QR au verso de votre carte PVC",
                  "Copiez le texte affiché et collez-le ci-dessous",
                ].map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                      style={{ backgroundColor: "var(--brand-brown)" }}
                    >
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>

              <div>
                <label htmlFor="qr-data" className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--brand-brown)" }}>
                  <ScanLine className="w-4 h-4" />
                  Contenu du QR code *
                </label>
                <textarea
                  id="qr-data"
                  value={qrData}
                  onChange={(e) => setQrData(e.target.value)}
                  placeholder='{"app":"balandou","action":"activate",...}'
                  className="w-full px-3 py-2 border border-[#e8ddd4] rounded text-sm font-mono min-h-[90px] resize-y"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white text-sm font-semibold rounded disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-brown)" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activation...
                </>
              ) : (
                "Activer ma licence"
              )}
            </button>
          </form>

          {isDevMode && (
            <div className="mt-6 pt-6 border-t border-[#f0e8df] text-center">
              <p className="text-xs mb-2" style={{ color: "var(--brand-gray)" }}>Mode test développeur</p>
              <button
                type="button"
                onClick={handleDevActivate}
                disabled={isDevActivating}
                className="text-sm font-medium underline"
                style={{ color: "var(--brand-sky-dark)" }}
              >
                {isDevActivating ? "Activation..." : "Utiliser une carte test (admin)"}
              </button>
            </div>
          )}

          <p className="mt-6 text-xs text-center" style={{ color: "var(--brand-gray)" }}>
            Pas de carte ? Contactez {BRAND.contact.phoneDisplay}
          </p>
        </div>
      </div>
    </NkoShell>
  );
};

export default ActivateLicensePage;
