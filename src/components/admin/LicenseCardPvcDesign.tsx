"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { BRAND } from "@/constants/brand";
import { buildLicenseQrPayload } from "@/lib/license/qr-payload";
import type { AdminLicenseCard, CardDurationMonths } from "@/lib/admin/types";

const DURATION_STYLES: Record<CardDurationMonths, { bg: string; label: string }> = {
  3: { bg: "#29B6F6", label: "3 MOIS" },
  6: { bg: "#8BC34A", label: "6 MOIS" },
  12: { bg: "#E8B923", label: "12 MOIS" },
};

interface LicenseCardPvcDesignProps {
  card: Pick<AdminLicenseCard, "id" | "duration_months" | "activation_token">;
  side?: "recto" | "verso" | "both";
  className?: string;
}

/**
 * Carte PVC CR80 — licence UNIQUEMENT dans le QR au verso.
 * Recto : marque + durée (aucun code visible).
 */
const LicenseCardPvcDesign = ({ card, side = "both", className = "" }: LicenseCardPvcDesignProps) => {
  const [qrDataUrl, setQrDataUrl] = useState("");

  const durationStyle = DURATION_STYLES[card.duration_months];
  const qrPayload = buildLicenseQrPayload(card.id, card.activation_token ?? "");

  useEffect(() => {
    if (!card.activation_token) return;
    QRCode.toDataURL(qrPayload, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: BRAND.colors.brownDark, light: "#FFFFFF" },
    }).then(setQrDataUrl);
  }, [qrPayload, card.activation_token]);

  const cardBaseClass = "license-pvc-card relative overflow-hidden rounded-[3.5mm] shadow-lg";

  /** Recto — branding seulement, pas de code */
  const Recto = (
    <div
      className={`${cardBaseClass} license-pvc-recto`}
      style={{
        width: "85.6mm",
        height: "53.98mm",
        background: `linear-gradient(135deg, ${BRAND.colors.brown} 0%, ${BRAND.colors.brownDark} 55%, #3D2818 100%)`,
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[1.2mm]" style={{ backgroundColor: BRAND.colors.sky }} />

      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, #fff 2px, #fff 3px)`,
        }}
        aria-hidden="true"
      />

      <div
        className="absolute top-[6mm] right-[4mm] w-[18mm] h-[4mm] rounded-sm opacity-80"
        style={{ background: "linear-gradient(90deg, #C9A96E, #E8B923, #fff, #E8B923, #C9A96E)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-[5mm] text-center">
        <div
          className="relative mb-[2mm] rounded-full p-[0.5mm]"
          style={{ boxShadow: `0 0 0 0.8mm ${BRAND.colors.gold}` }}
        >
          <Image
            src={BRAND.logo}
            alt=""
            width={48}
            height={48}
            className="h-[12mm] w-[12mm] rounded-full object-cover"
          />
        </div>

        <p className="text-[2.8mm] font-bold uppercase tracking-wide text-white leading-tight">
          Balandou Wourouki Digital
        </p>
        <p className="mt-[1mm] text-[2mm] font-medium" style={{ color: BRAND.colors.tan }}>
          Licence d&apos;accès · N&apos;ko Mandingue
        </p>

        <span
          className="mt-[3mm] rounded-full px-[3mm] py-[1mm] text-[2.4mm] font-bold"
          style={{
            backgroundColor: durationStyle.bg,
            color: card.duration_months === 12 ? BRAND.colors.brownDark : "#fff",
          }}
        >
          {durationStyle.label}
        </span>

        <p className="mt-[3mm] text-[1.6mm] text-white/60">
          Retournez la carte et scannez le QR dans l&apos;application
        </p>

        <p className="absolute bottom-[2mm] left-0 right-0 text-[1.3mm] text-white/40">
          Développé par {BRAND.silycore.name}
        </p>
      </div>
    </div>
  );

  /** Verso — QR central (licence cachée dedans) */
  const Verso = (
    <div
      className={`${cardBaseClass} license-pvc-verso`}
      style={{
        width: "85.6mm",
        height: "53.98mm",
        backgroundColor: BRAND.colors.background,
      }}
    >
      <div className="absolute top-[3mm] left-0 right-0 h-[6mm] bg-[#1a1a1a]" aria-hidden="true" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center pt-[8mm] pb-[7mm] px-[4mm]">
        <p className="text-[2mm] font-bold mb-[2mm]" style={{ color: BRAND.colors.brown }}>
          Activez votre licence
        </p>

        <div
          className="rounded-[2mm] border-2 bg-white p-[1.5mm]"
          style={{ borderColor: BRAND.colors.gold }}
        >
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR activation licence" className="w-[22mm] h-[22mm]" />
          ) : (
            <div className="w-[22mm] h-[22mm] bg-gray-100" />
          )}
        </div>

        <ol className="mt-[2.5mm] text-center space-y-[0.5mm] text-[1.7mm] leading-snug" style={{ color: BRAND.colors.grayDark }}>
          <li>1. Ouvrez l&apos;app <strong>Balandou Wourouki</strong></li>
          <li>2. Menu → <strong>Activer ma carte</strong></li>
          <li>3. Scannez ce QR code</li>
        </ol>

          <p className="mt-[2mm] text-[1.4mm] text-center" style={{ color: BRAND.colors.gray }}>
            Support : {BRAND.contact.phoneDisplay} · {BRAND.contact.email}
          </p>
          <p className="mt-[1mm] text-[1.2mm] text-center leading-tight" style={{ color: BRAND.colors.grayDark }}>
            {BRAND.silycore.tagline} · {BRAND.silycore.name} · {BRAND.silycore.phoneDisplay}
          </p>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-[5mm] flex items-center justify-center"
        style={{ backgroundColor: BRAND.colors.brown }}
      >
        <p className="text-[1.4mm] font-semibold text-white tracking-wide">
          {BRAND.tagline} · Développé par {BRAND.silycore.name}
        </p>
      </div>
    </div>
  );

  if (side === "recto") return <div className={className}>{Recto}</div>;
  if (side === "verso") return <div className={className}>{Verso}</div>;

  return (
    <div className={`flex flex-col sm:flex-row gap-6 items-start ${className}`}>
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: "var(--brand-gray)" }}>Recto (face avant — sans code)</p>
        {Recto}
      </div>
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: "var(--brand-gray)" }}>Verso (QR licence — scan uniquement)</p>
        {Verso}
      </div>
    </div>
  );
};

export default LicenseCardPvcDesign;
