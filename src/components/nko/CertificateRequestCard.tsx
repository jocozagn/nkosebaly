"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, CreditCard, Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export interface CertificateEligibility {
  course_id: string;
  course_title: string;
  eligible: boolean;
  reason: string;
  status: "none" | "pending" | "issued";
  certificate_id?: string;
  unique_code?: string;
  /** Paiement Djomy initié mais pas encore confirmé */
  awaiting_payment?: boolean;
}

interface CertificateRequestCardProps {
  item: CertificateEligibility;
  onUpdated?: () => void;
  compact?: boolean;
  /** Prix certificat en GNF (depuis les paramètres admin) */
  certificatePrice?: number;
}

const formatGnf = (amount: number): string =>
  new Intl.NumberFormat("fr-GN", { style: "decimal", maximumFractionDigits: 0 }).format(amount);

/** Bloc paiement / suggestion de certificat pour un cours */
const CertificateRequestCard = ({
  item,
  onUpdated,
  compact = false,
  certificatePrice = 50000,
}: CertificateRequestCardProps) => {
  const [isPaying, setIsPaying] = useState(false);

  const handlePay = async (): Promise<void> => {
    setIsPaying(true);
    const res = await fetch("/api/certificates/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: item.course_id }),
    });
    const json = await res.json();
    setIsPaying(false);

    if (json.error) {
      toast.error(json.message ?? "Paiement impossible");
      return;
    }

    const paymentUrl = json.data?.paymentUrl as string | undefined;
    if (!paymentUrl) {
      toast.error("Lien de paiement indisponible");
      return;
    }

    window.location.href = paymentUrl;
  };

  if (item.status === "issued" && item.certificate_id) {
    return (
      <div className={`rounded-lg border border-green-200 bg-green-50 ${compact ? "p-3" : "p-4"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-green-700" />
            <div>
              <p className="text-sm font-semibold text-green-800">Certificat délivré</p>
              {!compact && (
                <p className="text-xs text-green-700">{item.course_title} · {item.unique_code}</p>
              )}
            </div>
          </div>
          <Link
            href={`/dashboard/certificates/${item.certificate_id}`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-green-700 text-white"
          >
            <Download className="w-3.5 h-3.5" />
            Voir / Imprimer
          </Link>
        </div>
      </div>
    );
  }

  if (item.status === "pending") {
    return (
      <div className={`rounded-lg border border-amber-200 bg-amber-50 ${compact ? "p-3" : "p-4"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-amber-900">
              {item.awaiting_payment ? "Paiement en attente" : "Demande en cours"} — {item.course_title}
            </p>
            <p className="text-xs text-amber-800 mt-1">
              {item.awaiting_payment
                ? "Finalisez le paiement pour recevoir votre certificat."
                : "Votre certificat sera disponible après validation par l'administrateur."}
            </p>
          </div>
          {item.awaiting_payment && (
            <button
              type="button"
              onClick={handlePay}
              disabled={isPaying}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded text-white bg-amber-700 disabled:opacity-50"
            >
              {isPaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
              Reprendre le paiement
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!item.eligible) {
    if (compact) return null;
    return (
      <div className="rounded-lg border border-[#e8ddd4] p-4" style={{ backgroundColor: "var(--brand-bg)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--brand-brown)" }}>
          Certificat — {item.course_title}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--brand-gray)" }}>{item.reason}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border-2 border-[var(--brand-gold)] ${compact ? "p-3" : "p-4"}`} style={{ backgroundColor: "#fffdf5" }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5" style={{ color: "var(--brand-gold)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--brand-brown)" }}>
              {compact ? "Obtenez votre certificat !" : `Certificat disponible — ${item.course_title}`}
            </p>
            <p className="text-xs" style={{ color: "var(--brand-gray)" }}>
              Cours et quiz validés. Paiement sécurisé via Djomy — {formatGnf(certificatePrice)} GNF
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handlePay}
          disabled={isPaying}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-brown)" }}
        >
          {isPaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
          Payer {formatGnf(certificatePrice)} GNF
        </button>
      </div>
    </div>
  );
};

export default CertificateRequestCard;
