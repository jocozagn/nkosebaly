"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";
import NkoShell from "@/components/nko/NkoShell";

/** Page annulation paiement licence Djomy */
const LicensePaymentCancelPage = () => (
  <NkoShell>
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <XCircle className="w-14 h-14 mx-auto mb-4 text-amber-500" />
      <h1 className="text-xl font-bold mb-2" style={{ color: "var(--brand-brown)" }}>
        Paiement annulé
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--brand-gray)" }}>
        Vous pouvez réessayer ou activer une licence avec un code carte PVC.
      </p>
      <Link
        href="/dashboard/activate-license"
        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded text-white"
        style={{ backgroundColor: "var(--brand-brown)" }}
      >
        Retour à l&apos;activation
      </Link>
    </div>
  </NkoShell>
);

export default LicensePaymentCancelPage;
