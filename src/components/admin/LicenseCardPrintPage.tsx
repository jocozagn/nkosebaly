"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import LicenseCardPvcDesign from "@/components/admin/LicenseCardPvcDesign";
import BrandLoader from "@/components/ui/BrandLoader";
import {
  buildCardPngFilename,
  captureCardElementPng,
  CARD_PNG_EXPORT_CONTAINER_STYLE,
  CARD_PNG_EXPORT_STAGE_STYLE,
  downloadPngDataUrl,
  waitForCardQrRender,
} from "@/lib/license/card-png-export";
import type { AdminLicenseCard } from "@/lib/admin/types";

/** Page d'aperçu et impression carte PVC */
const LicenseCardPrintPage = () => {
  const searchParams = useSearchParams();
  const cardId = searchParams.get("id");
  const [card, setCard] = useState<AdminLicenseCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPngReady, setIsPngReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const rectoRef = useRef<HTMLDivElement | null>(null);
  const versoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!cardId) {
      setIsLoading(false);
      return;
    }
    fetch("/api/admin/cards")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) {
          const found = (res.data as AdminLicenseCard[]).find((c) => c.id === cardId);
          setCard(found ?? null);
        }
        setIsLoading(false);
      });
  }, [cardId]);

  useEffect(() => {
    if (!card) {
      setIsPngReady(false);
      return;
    }

    setIsPngReady(false);
    let cancelled = false;
    waitForCardQrRender().then(() => {
      if (!cancelled) setIsPngReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [card]);

  const handlePrint = (): void => {
    window.print();
  };

  const handleDownloadPng = async (side: "recto" | "verso"): Promise<void> => {
    if (!card || !isPngReady) return;
    const element = side === "recto" ? rectoRef.current : versoRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      const png = await captureCardElementPng(element);
      downloadPngDataUrl(png, buildCardPngFilename(card.code_text, side));
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <BrandLoader variant="inline" message="Chargement de la carte..." />;
  }

  if (!card) {
    return (
      <div className="text-center py-12">
        <p className="text-sm mb-4" style={{ color: "var(--brand-gray)" }}>Carte introuvable</p>
        <Link href="/admin/cards" className="text-sm underline" style={{ color: "var(--brand-brown)" }}>
          Retour aux cartes
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Styles impression PVC CR80 */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .license-print-area,
          .license-print-area * {
            visibility: visible;
          }
          .license-print-toolbar {
            display: none !important;
          }
          .license-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .license-pvc-print-sheet {
            page-break-after: always;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 85.6mm;
            height: 53.98mm;
            margin: 0 auto;
          }
          @page {
            size: 85.6mm 53.98mm;
            margin: 0;
          }
          .license-pvc-card {
            box-shadow: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="license-print-toolbar mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/cards" className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--brand-brown)" }}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleDownloadPng("recto")}
            disabled={!isPngReady || isExporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded border border-[#e8ddd4] disabled:opacity-50"
            style={{ color: "var(--brand-brown)" }}
          >
            <Download className="w-4 h-4" /> PNG recto
          </button>
          <button
            type="button"
            onClick={() => handleDownloadPng("verso")}
            disabled={!isPngReady || isExporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded border border-[#e8ddd4] disabled:opacity-50"
            style={{ color: "var(--brand-brown)" }}
          >
            <Download className="w-4 h-4" /> PNG verso
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded"
            style={{ backgroundColor: "var(--brand-brown)" }}
          >
            <Printer className="w-4 h-4" /> Imprimer (PVC CR80)
          </button>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-lg border border-[#e8ddd4] text-sm" style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-gray)" }}>
        <p className="font-medium mb-1" style={{ color: "var(--brand-brown)" }}>Spécifications impression PVC</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Format : <strong>85,6 × 54 mm</strong> (CR80)</li>
          <li><strong>Recto</strong> : marque + durée — aucun code visible</li>
          <li><strong>Verso</strong> : QR code = licence (scan dans l&apos;app uniquement)</li>
          <li>Impression duplex : recto puis verso</li>
        </ul>
      </div>

      {/* Aperçu écran */}
      <div className="license-print-area">
        <div className="hidden print:block license-pvc-print-sheet">
          <LicenseCardPvcDesign card={card} side="recto" />
        </div>
        <div className="hidden print:block license-pvc-print-sheet">
          <LicenseCardPvcDesign card={card} side="verso" />
        </div>
        <div className="print:hidden">
          <LicenseCardPvcDesign card={card} side="both" />
        </div>
      </div>

      <div style={CARD_PNG_EXPORT_STAGE_STYLE} aria-hidden>
        <div style={CARD_PNG_EXPORT_CONTAINER_STYLE}>
          <LicenseCardPvcDesign card={card} side="recto" forExport cardRef={rectoRef} />
        </div>
        <div style={CARD_PNG_EXPORT_CONTAINER_STYLE}>
          <LicenseCardPvcDesign card={card} side="verso" forExport cardRef={versoRef} />
        </div>
      </div>
    </>
  );
};

export default LicenseCardPrintPage;
