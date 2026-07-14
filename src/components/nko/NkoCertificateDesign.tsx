"use client";

import Image from "next/image";
import { BRAND } from "@/constants/brand";

interface NkoCertificateDesignProps {
  studentName: string;
  courseTitle: string;
  uniqueCode: string;
  issuedAt?: string;
  verifyUrl: string;
}

/** Design imprimable du certificat N'ko */
const NkoCertificateDesign = ({
  studentName,
  courseTitle,
  uniqueCode,
  issuedAt,
  verifyUrl,
}: NkoCertificateDesignProps) => {
  const issuedLabel = issuedAt
    ? new Date(issuedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const fullVerifyUrl = typeof window !== "undefined"
    ? `${window.location.origin}${verifyUrl}`
    : verifyUrl;

  return (
    <div
      id="nko-certificate"
      className="relative mx-auto bg-white text-center overflow-hidden"
      style={{
        width: "100%",
        maxWidth: "900px",
        aspectRatio: "1.414 / 1",
        border: "12px solid var(--brand-brown)",
        boxShadow: "inset 0 0 0 4px var(--brand-gold), inset 0 0 0 8px var(--brand-brown)",
      }}
    >
      <div className="absolute inset-4 border-2 border-[var(--brand-sky)] pointer-events-none" aria-hidden="true" />

      <div className="relative h-full flex flex-col items-center justify-between px-8 py-10 md:px-14 md:py-12">
        <div className="flex flex-col items-center gap-3">
          <Image
            src={BRAND.logo}
            alt={BRAND.name}
            width={80}
            height={80}
            className="h-16 w-16 md:h-20 md:w-20 rounded-full object-cover ring-4 ring-[var(--brand-gold)]"
          />
          <p className="font-nko text-xs md:text-sm font-bold tracking-wide" style={{ color: "var(--brand-brown)" }}>
            {BRAND.nameNko}
          </p>
          <p className="text-[10px] md:text-xs font-bold tracking-widest uppercase" style={{ color: "var(--brand-brown-dark)" }}>
            {BRAND.name}
          </p>
          <p className="font-nko text-[10px] md:text-xs mt-1" style={{ color: "var(--brand-gray)" }}>
            {BRAND.taglineNko}
          </p>
          <p className="font-nko text-[10px] md:text-xs mt-2" style={{ color: "var(--brand-brown)" }}>
            {BRAND.professor.nko}
          </p>
          <p className="text-[9px] md:text-[10px]" style={{ color: "var(--brand-gray)" }}>
            {BRAND.professor.french}
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <p className="text-sm md:text-base tracking-wide mb-2" style={{ color: "var(--brand-gray-dark)" }}>
            Certificat de réussite
          </p>
          <p className="text-xs md:text-sm mb-4" style={{ color: "var(--brand-gray)" }}>
            Décerné à
          </p>
          <h1
            className="text-2xl md:text-4xl font-bold mb-4 px-4"
            style={{ color: "var(--brand-brown)", fontFamily: "Georgia, serif" }}
          >
            {studentName}
          </h1>
          <p className="text-xs md:text-sm max-w-lg leading-relaxed" style={{ color: "var(--brand-gray-dark)" }}>
            Pour avoir complété avec succès le cours
          </p>
          <h2 className="text-lg md:text-2xl font-semibold mt-2 mb-2" style={{ color: "var(--brand-black)" }}>
            {courseTitle}
          </h2>
          <p className="text-xs md:text-sm" style={{ color: "var(--brand-gray)" }}>
            et validé l&apos;ensemble des évaluations requises.
          </p>
        </div>

        <div className="w-full space-y-2">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-[10px] md:text-xs" style={{ color: "var(--brand-gray)" }}>
            <span>Émis le {issuedLabel}</span>
            <span className="font-mono font-semibold" style={{ color: "var(--brand-brown)" }}>{uniqueCode}</span>
          </div>
          <p className="text-[9px] md:text-[10px] break-all" style={{ color: "var(--brand-gray)" }}>
            Vérification : {fullVerifyUrl}
          </p>
          <p className="text-[9px] md:text-[10px] break-all" style={{ color: "var(--brand-gray)" }}>
            {BRAND.contact.email} · <span className="font-nko">{BRAND.contact.phoneDisplayNko}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NkoCertificateDesign;
