"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Award, CheckCircle, Loader2, XCircle } from "lucide-react";
import NkoShell from "@/components/nko/NkoShell";

type PaymentState = "loading" | "paid" | "pending" | "error";

/** Contenu de la page retour paiement */
const PaymentReturnContent = () => {
  const searchParams = useSearchParams();
  const certId = searchParams.get("cert_id");
  const transactionId =
    searchParams.get("transaction_id") ??
    searchParams.get("transactionId") ??
    searchParams.get("payment_id");
  const [state, setState] = useState<PaymentState>("loading");
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const verifyPayment = useCallback(async (): Promise<PaymentState> => {
    if (!certId) return "error";

    const params = new URLSearchParams({ cert_id: certId });
    if (transactionId) params.set("transaction_id", transactionId);

    const res = await fetch(`/api/certificates/payment/verify?${params.toString()}`);
    const json = await res.json();

    if (json.error && !json.data) return "error";

    setCertificateId(json.data?.certificate_id ?? certId);
    if (json.data?.status === "paid") return "paid";
    return "pending";
  }, [certId, transactionId]);

  useEffect(() => {
    if (!certId) {
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
  }, [certId, verifyPayment]);

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

        {state === "paid" && certificateId && (
          <>
            <CheckCircle className="w-14 h-14 mx-auto mb-4 text-green-600" />
            <h1 className="text-xl font-bold mb-2" style={{ color: "var(--brand-brown)" }}>
              Paiement confirmé !
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--brand-gray)" }}>
              Votre certificat est prêt à être consulté et imprimé.
            </p>
            <Link
              href={`/dashboard/certificates/${certificateId}`}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded text-white"
              style={{ backgroundColor: "var(--brand-brown)" }}
            >
              <Award className="w-4 h-4" />
              Voir mon certificat
            </Link>
          </>
        )}

        {state === "pending" && (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--brand-gold)" }} />
            <h1 className="text-xl font-bold mb-2" style={{ color: "var(--brand-brown)" }}>
              Paiement en cours de traitement
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--brand-gray)" }}>
              La confirmation peut prendre quelques instants. Consultez vos certificats dans un moment.
            </p>
            <Link
              href="/dashboard/certificates"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded text-white"
              style={{ backgroundColor: "var(--brand-brown)" }}
            >
              Mes certificats
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
            <Link href="/dashboard/certificates" className="text-sm underline" style={{ color: "var(--brand-brown)" }}>
              Retour aux certificats
            </Link>
          </>
        )}
      </div>
    </NkoShell>
  );
};

/** Page retour après paiement Djomy */
const CertificatePaymentReturnPage = () => (
  <Suspense fallback={<NkoShell><div className="p-16 text-center text-sm">Chargement...</div></NkoShell>}>
    <PaymentReturnContent />
  </Suspense>
);

export default CertificatePaymentReturnPage;
