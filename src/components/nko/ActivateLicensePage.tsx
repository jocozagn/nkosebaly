"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CreditCard, Hash, Loader2, ScanLine, ShoppingCart } from "lucide-react";
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

interface LicensePlanOption {
  id: string;
  duration_months: number;
  price_gnf: number;
  label: string;
}

interface LicensePricing {
  plans: LicensePlanOption[];
  license_price: number;
  license_duration_months: number;
  djomy_enabled: boolean;
}

type ActivationTab = "code" | "qr" | "buy";

const formatGnf = (amount: number): string =>
  new Intl.NumberFormat("fr-GN").format(amount);

/** Activation licence — code manuel, QR PVC ou achat en ligne Djomy */
const ActivateLicensePage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<ActivationTab>("code");
  const [licenseCode, setLicenseCode] = useState("");
  const [qrData, setQrData] = useState("");
  const [profile, setProfile] = useState<StudentProfileFormData>(defaultProfile);
  const [pricing, setPricing] = useState<LicensePricing | null>(null);
  const [selectedDurationMonths, setSelectedDurationMonths] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isDevActivating, setIsDevActivating] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [license, setLicense] = useState<LicenseInfo | null>(null);

  const isDevMode =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true";

  const checkLicense = async (): Promise<void> => {
    setIsChecking(true);
    await fetch("/api/license/status", { method: "POST" });

    const [statusRes, pricingRes] = await Promise.all([
      fetch("/api/license/status"),
      fetch("/api/license/pricing"),
    ]);
    const result = await statusRes.json();
    const pricingJson = await pricingRes.json();
    setIsChecking(false);

    if (!pricingJson.error && pricingJson.data) {
      const data = pricingJson.data as LicensePricing;
      setPricing(data);
      const firstPlan = data.plans?.[0];
      if (firstPlan) {
        setSelectedDurationMonths(firstPlan.duration_months);
      } else if (data.license_duration_months) {
        setSelectedDurationMonths(data.license_duration_months);
      }
    }

    if (!result.error && result.data?.session_revoked) {
      window.location.assign("/");
      return;
    }

    if (!result.error && result.data?.active) {
      setLicense(result.data);
      if (pathname === "/dashboard/activate-license") {
        triggerNavigationStart();
        router.replace("/dashboard");
      }
    }
  };

  useEffect(() => {
    void checkLicense();
  }, []);

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

  const submitActivation = async (payload: { license_code?: string; qr_data?: string }): Promise<void> => {
    setIsSubmitting(true);
    try {
      await fetch("/api/license/status", { method: "POST" });
      const res = await fetch("/api/license/activate-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, ...profile }),
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

  const handleActivateCode = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const code = licenseCode.trim();
    if (!code) {
      toast.error("Entrez votre code licence");
      return;
    }
    await submitActivation({ license_code: code });
  };

  const handleActivateQr = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const raw = qrData.trim();
    if (!raw) {
      toast.error("Collez le contenu du QR code");
      return;
    }
    await submitActivation({ qr_data: raw });
  };

  const handleBuyOnline = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!pricing?.djomy_enabled) {
      toast.error("Paiement en ligne indisponible pour le moment");
      return;
    }

    const selectedPlan =
      pricing.plans?.find((plan) => plan.duration_months === selectedDurationMonths) ??
      pricing.plans?.[0];

    if (!selectedPlan) {
      toast.error("Aucune formule licence disponible");
      return;
    }

    setIsPaying(true);
    try {
      await fetch("/api/license/status", { method: "POST" });
      const res = await fetch("/api/license/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, duration_months: selectedPlan.duration_months }),
      });
      const result = await res.json();

      if (result.error) {
        toast.error(result.message ?? "Impossible de lancer le paiement");
        return;
      }

      const paymentUrl = result.data?.paymentUrl as string | undefined;
      if (!paymentUrl) {
        toast.error("Lien de paiement introuvable");
        return;
      }

      window.location.href = paymentUrl;
    } catch {
      toast.error("Connexion au serveur impossible");
    } finally {
      setIsPaying(false);
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

  const tabButtonClass = (value: ActivationTab): string =>
    `flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm font-medium rounded transition-colors ${
      tab === value
        ? "text-white"
        : "text-[var(--brand-brown)] bg-[var(--brand-bg)] hover:bg-white"
    }`;

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
                Activer votre licence
              </h1>
              <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
                Code carte, QR PVC ou paiement en ligne
              </p>
            </div>
          </div>

          <div className="h-1 w-16 mb-6 bg-[var(--brand-gold)]" aria-hidden="true" />

          {/* Onglets — 3 parcours d'activation */}
          <div
            className="flex gap-1 p-1 rounded-lg mb-6 border border-[#e8ddd4]"
            style={{ backgroundColor: "var(--brand-bg)" }}
            role="tablist"
            aria-label="Mode d'activation"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "code"}
              className={tabButtonClass("code")}
              style={tab === "code" ? { backgroundColor: "var(--brand-brown)" } : undefined}
              onClick={() => setTab("code")}
            >
              <Hash className="w-4 h-4 shrink-0" />
              Code
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "qr"}
              className={tabButtonClass("qr")}
              style={tab === "qr" ? { backgroundColor: "var(--brand-brown)" } : undefined}
              onClick={() => setTab("qr")}
            >
              <ScanLine className="w-4 h-4 shrink-0" />
              QR PVC
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "buy"}
              className={tabButtonClass("buy")}
              style={tab === "buy" ? { backgroundColor: "var(--brand-brown)" } : undefined}
              onClick={() => setTab("buy")}
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              Acheter
            </button>
          </div>

          <StudentProfileFields
            values={profile}
            onChange={handleProfileChange}
            disabled={isSubmitting || isPaying}
          />

          {tab === "code" && (
            <form onSubmit={handleActivateCode} className="mt-6 space-y-4">
              <div>
                <label htmlFor="license-code" className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--brand-brown)" }}>
                  <Hash className="w-4 h-4" />
                  Code licence *
                </label>
                <input
                  id="license-code"
                  type="text"
                  value={licenseCode}
                  onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
                  placeholder="NKO-AB12-XY34"
                  className="w-full px-3 py-2.5 border border-[#e8ddd4] rounded text-sm font-mono tracking-wide uppercase"
                  required
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs mt-1.5" style={{ color: "var(--brand-gray)" }}>
                  Le code imprimé sur votre carte PVC (format NKO-XXXX-XXXX)
                </p>
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
                  "Activer avec mon code"
                )}
              </button>
            </form>
          )}

          {tab === "qr" && (
            <form onSubmit={handleActivateQr} className="mt-6 space-y-4">
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
                  "Activer avec le QR"
                )}
              </button>
            </form>
          )}

          {tab === "buy" && (
            <form onSubmit={handleBuyOnline} className="mt-6 space-y-4">
              <div
                className="rounded-lg border border-[#e8ddd4] p-4 space-y-4"
                style={{ backgroundColor: "var(--brand-bg)" }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--brand-brown)" }}>
                  Licence numérique — choisissez votre formule
                </p>

                {!pricing ? (
                  <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
                    Chargement des tarifs...
                  </p>
                ) : pricing.plans.length === 0 ? (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    Aucune formule active. Contactez l&apos;administrateur.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {pricing.plans.map((plan) => {
                      const isSelected = selectedDurationMonths === plan.duration_months;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedDurationMonths(plan.duration_months)}
                          className="text-left rounded-lg border-2 px-4 py-3 transition-colors"
                          style={{
                            borderColor: isSelected ? "var(--brand-brown)" : "#e8ddd4",
                            backgroundColor: isSelected ? "white" : "transparent",
                          }}
                        >
                          <p className="text-sm font-semibold" style={{ color: "var(--brand-brown-dark)" }}>
                            {plan.label}
                          </p>
                          <p className="text-lg font-bold mt-1" style={{ color: "var(--brand-brown)" }}>
                            {formatGnf(plan.price_gnf)} GNF
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}

                <p className="text-xs" style={{ color: "var(--brand-gray)" }}>
                  Paiement sécurisé via Djomy (Orange Money, MTN, carte bancaire…)
                </p>
              </div>

              {!pricing?.djomy_enabled && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Le paiement en ligne n&apos;est pas encore activé. Utilisez un code licence ou contactez-nous.
                </p>
              )}

              <button
                type="submit"
                disabled={isPaying || !pricing?.djomy_enabled || !pricing?.plans?.length}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white text-sm font-semibold rounded disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-brown)" }}
              >
                {isPaying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirection...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Payer en ligne
                  </>
                )}
              </button>
            </form>
          )}

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
            Besoin d&apos;aide ? Contactez {BRAND.contact.phoneDisplay}
          </p>
        </div>
      </div>
    </NkoShell>
  );
};

export default ActivateLicensePage;
