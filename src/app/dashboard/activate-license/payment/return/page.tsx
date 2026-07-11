"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, CreditCard, Loader2, XCircle } from "lucide-react";
import NkoShell from "@/components/nko/NkoShell";
import { triggerNavigationStart } from "@/utils/navigation";

type PaymentState = "loading" | "paid" | "pending" | "error";

/** Contenu page retour paiement licence Djomy */
const LicensePaymentReturnContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");
  const transactionId =
    searchParams.get("transaction_id") ??
    searchParams.get("transactionId") ??
    searchParams.get("payment_id");
  const [state, setState] = useState<PaymentState>("loading");
  const [codeText, setCodeText] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const verifyPayment = useCallback(async (): Promise<PaymentState> => {
    if (!orderId) return "error";

    const params = new URLSearchParams({ order_id: orderId });
    if (transactionId) params.set("transaction_id", transactionId);

    const res = await fetch(`/api/license/payment/verify?${params.toString()}`);
    const json = await res.json();

    if (json.error && !json.data) return "error";

    setCodeText(json.data?.code_text ?? null);
    if (json.data?.status === "paid") return "paid";
    return "pending";
  }, [orderId, transactionId]);

  useEffect(() => {
    if (!orderId) {
      setState("error");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;

    const run = async (): Promise<void> => {
      const result = await verifyPayment();
      if (cancelled) return;

      if (result === "paid") {
        setState("paid");
        setTimeout(() => {
          triggerNavigationStart();
          router.replace("/dashboard");
        }, 2500);
        return;
      }

      if (result === "error") {
        setState("error");
        return;
      }

      attempts += 1;
      setPollCount(attempts);

      if (attempts >= maxAttempts) {
        setState("pending");
        return;
      }

      setTimeout(() => {
        if (!cancelled) void run();
      }, 3000);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [orderId, verifyPayment, router]);

  return (
    <NkoShell>
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        {state === "loading" && (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: "var(--brand-gold)" }} />
            <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
              Vérification du paiement{pollCount > 0 ? ` (${pollCount}/10)` : ""}...
            </p>
          </>
        )}

        {state === "paid" && (
          <>
            <CheckCircle className="w-14 h-14 mx-auto mb-4 text-green-600" />
            <h1 className="text-xl font-bold mb-2" style={{ color: "var(--brand-brown)" }}>
              Licence activée !
            </h1>
            <p className="text-sm mb-2" style={{ color: "var(--brand-gray)" }}>
              Votre paiement a été confirmé. Bienvenue sur la plateforme.
            </p>
            {codeText && (
              <p className="text-sm font-mono mb-6" style={{ color: "var(--brand-brown)" }}>
                Code : {codeText}
              </p>
            )}
            <p className="text-xs" style={{ color: "var(--brand-gray)" }}>
              Redirection vers vos cours...
            </p>
          </>
        )}

        {state === "pending" && (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--brand-gold)" }} />
            <h1 className="text-xl font-bold mb-2" style={{ color: "var(--brand-brown)" }}>
              Paiement en cours de traitement
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--brand-gray)" }}>
              La confirmation peut prendre quelques instants. Revenez sur cette page ou contactez le support si le montant a été débité.
            </p>
            <Link
              href="/dashboard/activate-license"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded text-white"
              style={{ backgroundColor: "var(--brand-brown)" }}
            >
              <CreditCard className="w-4 h-4" />
              Retour activation
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="w-14 h-14 mx-auto mb-4 text-red-500" />
            <h1 className="text-xl font-bold mb-2" style={{ color: "var(--brand-brown)" }}>
              Erreur de vérification
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--brand-gray)" }}>
              Impossible de confirmer le paiement. Contactez le support si le montant a été débité.
            </p>
            <Link href="/dashboard/activate-license" className="text-sm underline" style={{ color: "var(--brand-brown)" }}>
              Retour à l&apos;activation
            </Link>
          </>
        )}
      </div>
    </NkoShell>
  );
};

/** Page retour après paiement licence Djomy */
const LicensePaymentReturnPage = () => (
  <Suspense fallback={<NkoShell><div className="p-16 text-center text-sm">Chargement...</div></NkoShell>}>
    <LicensePaymentReturnContent />
  </Suspense>
);

export default LicensePaymentReturnPage;
