"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import {
  Download,
  Globe,
  Link2,
  Mail,
  Phone,
} from "lucide-react";
import { BRAND } from "@/constants/brand";
import { buildLicenseQrPayload } from "@/lib/license/qr-payload";
import { formatGnfAmount, resolveCardPriceGnf } from "@/lib/license/plans";
import type { AdminLicenseCard, CardDurationMonths } from "@/lib/admin/types";

/** Palette PVC premium (inspirée maquette CR80) */
const CARD = {
  brunFonce: "#2b2118",
  brun: "#3a2a1c",
  brunClair: "#5c4630",
  or: "#c9a227",
  orClair: "#e8bf5d",
  creme: "#f2e9d8",
  cremeMat: "#cbbfa6",
  bleu: "#2f7bc4",
  bleuClair: "#eaf3fc",
  bandeau: "#1c150f",
  piedText: "#a9977c",
} as const;

const DURATION_LABELS: Record<CardDurationMonths, string> = {
  1: "1 mois",
  2: "2 mois",
  3: "3 mois",
  6: "6 mois",
  12: "12 mois",
};

interface LicenseCardPvcDesignProps {
  card: Pick<AdminLicenseCard, "id" | "duration_months" | "activation_token" | "card_price_gnf">;
  side?: "recto" | "verso" | "both";
  className?: string;
}

const cardShell =
  "license-pvc-card relative overflow-hidden rounded-[3mm] shadow-lg text-[#f2e9d8]";

/**
 * Carte PVC CR80 — recto marque + QR app, verso QR licence (code caché).
 * Layout aligné sur la maquette Karamoo Sêebaly (85,6 × 53,98 mm).
 */
const LicenseCardPvcDesign = ({ card, side = "both", className = "" }: LicenseCardPvcDesignProps) => {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [appQrDataUrl, setAppQrDataUrl] = useState("");

  const qrPayload = buildLicenseQrPayload(card.id, card.activation_token ?? "");
  const webBaseUrl = (process.env.NEXT_PUBLIC_WEB_URL ?? "https://silycor.xyz").replace(/\/$/, "");
  const shortHost = webBaseUrl.replace(/^https?:\/\//, "");
  const appDownloadUrl = `${webBaseUrl}/get-app`;
  const priceGnf = resolveCardPriceGnf(card.duration_months, card.card_price_gnf);
  const priceLabel = priceGnf != null ? `${formatGnfAmount(priceGnf)} GNF` : null;

  useEffect(() => {
    if (!card.activation_token) return;
    QRCode.toDataURL(qrPayload, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: CARD.brunFonce, light: "#FFFFFF" },
    }).then(setQrDataUrl);
  }, [qrPayload, card.activation_token]);

  useEffect(() => {
    QRCode.toDataURL(appDownloadUrl, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: CARD.brunFonce, light: "#FFFFFF" },
    }).then(setAppQrDataUrl);
  }, [appDownloadUrl]);

  const QrBox = ({ src, size = "18mm" }: { src: string; size?: string }) => (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-[1.8mm] border-[0.4mm] bg-white"
      style={{ width: size, height: size, borderColor: CARD.or }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain" />
      ) : (
        <div className="h-full w-full bg-gray-100" />
      )}
    </div>
  );

  const Recto = (
    <div
      className={`${cardShell} license-pvc-recto flex flex-col`}
      style={{ width: "85.6mm", height: "53.98mm", backgroundColor: CARD.brun, padding: "4mm 4.5mm" }}
    >
      {/* En-tête : logo + nom + badge durée */}
      <div className="flex items-center justify-between gap-[2mm]">
        <div className="flex min-w-0 items-center gap-[2.5mm]">
          <div
            className="flex h-[7mm] w-[7mm] shrink-0 items-center justify-center overflow-hidden rounded-full border-[0.5mm]"
            style={{ borderColor: CARD.or }}
          >
            <Image
              src={BRAND.logo}
              alt=""
              width={28}
              height={28}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="font-nko truncate text-[2.8mm] font-semibold" style={{ color: CARD.creme }}>
              {BRAND.nameNko}
            </p>
            <p className="truncate text-[2mm] font-semibold uppercase tracking-[0.2mm]" style={{ color: CARD.orClair }}>
              {BRAND.name}
            </p>
            <p className="font-nko text-[1.9mm] leading-tight" style={{ color: CARD.or }}>
              {BRAND.taglineNko}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-[0.6mm]">
          <span
            className="rounded-full px-[2.5mm] py-[1mm] text-[2.3mm] font-semibold whitespace-nowrap"
            style={{ backgroundColor: CARD.bleu, color: CARD.bleuClair }}
          >
            {DURATION_LABELS[card.duration_months]}
          </span>
          {priceLabel && (
            <span
              className="rounded-full px-[2.5mm] py-[0.8mm] text-[2mm] font-bold whitespace-nowrap"
              style={{ backgroundColor: CARD.or, color: CARD.brunFonce }}
            >
              {priceLabel}
            </span>
          )}
        </div>
      </div>

      {/* Corps : QR app + liens */}
      <div className="mt-[2.5mm] flex flex-1 items-center gap-[3.5mm]">
        <QrBox src={appQrDataUrl} />
        <div className="min-w-0 space-y-[0.8mm]">
          <p className="flex items-center gap-[1.2mm] text-[2.1mm] font-semibold" style={{ color: CARD.creme }}>
            <Download className="h-[2.6mm] w-[2.6mm] shrink-0" style={{ color: CARD.or }} aria-hidden />
            Télécharger l&apos;app
          </p>
          <p className="flex items-center gap-[1.2mm] text-[2.1mm]" style={{ color: CARD.cremeMat }}>
            <Link2 className="h-[2.6mm] w-[2.6mm] shrink-0" style={{ color: CARD.or }} aria-hidden />
            {shortHost}/get-app
          </p>
          <p className="flex items-center gap-[1.2mm] text-[2.1mm]" style={{ color: CARD.cremeMat }}>
            <Globe className="h-[2.6mm] w-[2.6mm] shrink-0" style={{ color: CARD.or }} aria-hidden />
            {shortHost}
          </p>
        </div>
      </div>

      {/* Pied recto — contact professeur (N'ko + français) */}
      <div className="mt-[1.5mm] border-t pt-[1.2mm] text-center leading-tight" style={{ borderColor: CARD.brunClair }}>
        <p className="font-nko text-[1.7mm] font-medium" style={{ color: CARD.cremeMat }}>
          {BRAND.contact.phoneDisplayNko}
        </p>
        <p className="text-[1.7mm] font-semibold" style={{ color: CARD.creme }}>
          {BRAND.contact.phoneDisplay}
        </p>
        <p className="mt-[0.5mm] text-[1.5mm] uppercase tracking-[0.2mm]" style={{ color: CARD.piedText }}>
          {BRAND.professor.french}
        </p>
      </div>
    </div>
  );

  const activationSteps = [
    <>Ouvrez l&apos;app <strong className="font-nko font-semibold" style={{ color: CARD.creme }}>{BRAND.nameNko}</strong></>,
    <>Menu → <strong className="font-semibold" style={{ color: CARD.creme }}>Activer ma carte</strong></>,
    <>Scannez ce QR code</>,
  ];

  const Verso = (
    <div
      className={`${cardShell} license-pvc-verso flex flex-col`}
      style={{ width: "85.6mm", height: "53.98mm", backgroundColor: CARD.brunFonce }}
    >
      <div className="py-[1.8mm] text-center leading-tight" style={{ backgroundColor: CARD.bandeau }}>
        <p className="text-[2.3mm] font-semibold" style={{ color: CARD.orClair }}>
          Activez votre licence
        </p>
        {priceLabel && (
          <p className="text-[2mm] font-bold" style={{ color: CARD.creme }}>
            {priceLabel}
          </p>
        )}
      </div>

      <div className="flex flex-1 items-center gap-[3.5mm] px-[4.5mm] py-[2.5mm]">
        <QrBox src={qrDataUrl} size="19mm" />
        <ol className="m-0 flex list-none flex-col gap-[1.3mm] p-0">
          {activationSteps.map((step, index) => (
            <li
              key={index}
              className="flex gap-[1.5mm] text-[2.1mm] leading-snug"
              style={{ color: "#e3d7c0" }}
            >
              <span
                className="flex h-[3.2mm] w-[3.2mm] shrink-0 items-center justify-center rounded-full text-[1.8mm] font-bold"
                style={{ backgroundColor: CARD.or, color: CARD.brunFonce }}
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col items-center gap-[0.6mm] px-[4.5mm] pb-[1mm] text-center">
        <div className="flex items-start justify-center gap-[1mm]">
          <Phone className="mt-[0.2mm] h-[2.2mm] w-[2.2mm] shrink-0" style={{ color: CARD.or }} aria-hidden />
          <div className="leading-tight">
            <p className="font-nko text-[1.8mm]" style={{ color: CARD.cremeMat }}>
              {BRAND.contact.phoneDisplayNko}
            </p>
            <p className="text-[1.8mm] font-semibold" style={{ color: CARD.creme }}>
              {BRAND.contact.phoneDisplay}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-[1mm] text-[1.7mm]" style={{ color: CARD.cremeMat }}>
          <Mail className="h-[2.2mm] w-[2.2mm]" style={{ color: CARD.or }} aria-hidden />
          {BRAND.contact.email}
        </span>
      </div>

      <div className="py-[1.5mm] text-center" style={{ backgroundColor: CARD.bandeau }}>
        <p className="font-nko text-[1.6mm] tracking-[0.2mm]" style={{ color: CARD.piedText }}>
          {BRAND.taglineNko} · {BRAND.professor.nko}
        </p>
      </div>
    </div>
  );

  if (side === "recto") return <div className={className}>{Recto}</div>;
  if (side === "verso") return <div className={className}>{Verso}</div>;

  return (
    <div className={`flex flex-col flex-wrap items-start gap-[30px] sm:flex-row ${className}`}>
      <div>
        <p className="mb-2 text-xs font-medium" style={{ color: "var(--brand-gray)" }}>
          Recto — marque + téléchargement app
        </p>
        {Recto}
      </div>
      <div>
        <p className="mb-2 text-xs font-medium" style={{ color: "var(--brand-gray)" }}>
          Verso — QR activation licence
        </p>
        {Verso}
      </div>
    </div>
  );
};

export default LicenseCardPvcDesign;
