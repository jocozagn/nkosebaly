"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import LicenseCardPvcDesign from "@/components/admin/LicenseCardPvcDesign";
import BrandLoader from "@/components/ui/BrandLoader";
import {
  buildCardPngFilename,
  buildCardsPngZip,
  captureCardElementPng,
  CARD_PNG_DPI,
  CARD_PNG_EXPORT_CONTAINER_STYLE,
  CARD_PNG_EXPORT_STAGE_STYLE,
  CARD_PNG_HEIGHT,
  CARD_PNG_WIDTH,
  downloadBlob,
  downloadPngDataUrl,
  waitForCardQrRender,
} from "@/lib/license/card-png-export";
import type { AdminLicenseCard } from "@/lib/admin/types";

/** Export PNG recto / verso — une image par face, par carte (imprimerie PVC) */
const LicenseCardPngExportPage = () => {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids") ?? "";
  const requestedIds = useMemo(
    () =>
      idsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    [idsParam]
  );

  const [allCards, setAllCards] = useState<AdminLicenseCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState("");

  const rectoRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const versoRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetch("/api/admin/cards")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) setAllCards(res.data ?? []);
        setIsLoading(false);
      });
  }, []);

  const selectedCards = useMemo(() => {
    if (requestedIds.length === 0) return [];
    const map = new Map(allCards.map((c) => [c.id, c]));
    return requestedIds.map((id) => map.get(id)).filter(Boolean) as AdminLicenseCard[];
  }, [allCards, requestedIds]);

  useEffect(() => {
    if (selectedCards.length === 0) {
      setIsReady(false);
      return;
    }

    setIsReady(false);
    let cancelled = false;

    waitForCardQrRender().then(() => {
      if (!cancelled) setIsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedCards]);

  const handleDownloadZip = useCallback(async (): Promise<void> => {
    if (!isReady || selectedCards.length === 0) return;

    setIsExporting(true);
    setProgress("Préparation du ZIP...");

    try {
      const items = selectedCards
        .map((card) => ({
          codeText: card.code_text,
          rectoElement: rectoRefs.current[card.id],
          versoElement: versoRefs.current[card.id],
        }))
        .filter(
          (item): item is { codeText: string; rectoElement: HTMLDivElement; versoElement: HTMLDivElement } =>
            Boolean(item.rectoElement && item.versoElement)
        );

      const blob = await buildCardsPngZip(items);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `cartes-licence-${stamp}.zip`);
      setProgress(`${items.length * 2} PNG exportés dans le ZIP`);
    } catch {
      setProgress("Erreur lors de l'export PNG");
    } finally {
      setIsExporting(false);
    }
  }, [isReady, selectedCards]);

  const handleDownloadOne = useCallback(
    async (card: AdminLicenseCard, side: "recto" | "verso"): Promise<void> => {
      const element = side === "recto" ? rectoRefs.current[card.id] : versoRefs.current[card.id];
      if (!element || !isReady) return;

      setIsExporting(true);
      setProgress(`Export ${card.code_text} (${side})...`);

      try {
        const png = await captureCardElementPng(element);
        downloadPngDataUrl(png, buildCardPngFilename(card.code_text, side));
        setProgress(`${buildCardPngFilename(card.code_text, side)} téléchargé`);
      } catch {
        setProgress("Erreur export PNG");
      } finally {
        setIsExporting(false);
      }
    },
    [isReady]
  );

  if (isLoading) {
    return <BrandLoader variant="inline" message="Chargement des cartes..." />;
  }

  if (requestedIds.length === 0 || selectedCards.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-sm" style={{ color: "var(--brand-gray)" }}>
          Sélectionnez des cartes dans l&apos;admin puis cliquez sur « Exporter PNG ».
        </p>
        <Link href="/admin/cards" className="text-sm underline" style={{ color: "var(--brand-brown)" }}>
          Retour aux cartes
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/cards" className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--brand-brown)" }}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={!isReady || isExporting}
          className="inline-flex items-center gap-2 rounded px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-brown)" }}
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isReady ? `ZIP (${selectedCards.length * 2} PNG)` : "Préparation QR..."}
        </button>
      </div>

      <div
        className="mb-6 rounded-lg border border-[#e8ddd4] p-4 text-sm"
        style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-gray)" }}
      >
        <p className="mb-2 font-medium" style={{ color: "var(--brand-brown)" }}>
          Export PNG pour imprimerie (CR80 — 300 DPI)
        </p>
        <ul className="list-inside list-disc space-y-1 text-xs">
          <li>
            <strong>{selectedCards.length} carte(s)</strong> → {selectedCards.length * 2} fichiers PNG (recto + verso)
          </li>
          <li>Noms : <strong>NKO-0001-recto.png</strong>, <strong>NKO-0001-verso.png</strong>, etc.</li>
          <li>Taille : <strong>{CARD_PNG_WIDTH} × {CARD_PNG_HEIGHT} px</strong> ({CARD_PNG_DPI} DPI, bord à bord)</li>
        </ul>
        {progress ? <p className="mt-2 text-xs font-medium" style={{ color: "var(--brand-brown)" }}>{progress}</p> : null}
      </div>

      <div className="space-y-4 print:hidden">
        {selectedCards.map((card) => (
          <div
            key={card.id}
            className="flex flex-col gap-3 rounded-lg border border-[#e8ddd4] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="font-mono text-sm font-semibold" style={{ color: "var(--brand-brown)" }}>
              {card.code_text} — {card.duration_months} mois
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!isReady || isExporting}
                onClick={() => handleDownloadOne(card, "recto")}
                className="rounded border border-[#e8ddd4] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                PNG recto
              </button>
              <button
                type="button"
                disabled={!isReady || isExporting}
                onClick={() => handleDownloadOne(card, "verso")}
                className="rounded border border-[#e8ddd4] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                PNG verso
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Rendu hors écran — conteneur = taille exacte CR80, sans marge */}
      <div style={CARD_PNG_EXPORT_STAGE_STYLE} aria-hidden>
        {selectedCards.map((card) => (
          <div key={card.id}>
            <div style={CARD_PNG_EXPORT_CONTAINER_STYLE}>
              <LicenseCardPvcDesign
                card={card}
                side="recto"
                forExport
                cardRef={(node) => {
                  rectoRefs.current[card.id] = node;
                }}
              />
            </div>
            <div style={CARD_PNG_EXPORT_CONTAINER_STYLE}>
              <LicenseCardPvcDesign
                card={card}
                side="verso"
                forExport
                cardRef={(node) => {
                  versoRefs.current[card.id] = node;
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default LicenseCardPngExportPage;
