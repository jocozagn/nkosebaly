"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import LicenseCardA4Sheet from "@/components/admin/LicenseCardA4Sheet";
import BrandLoader from "@/components/ui/BrandLoader";
import { CARDS_PER_A4_PAGE, chunkCardsForA4 } from "@/lib/license/a4-print-layout";
import type { AdminLicenseCard } from "@/lib/admin/types";

/** Impression lot — plusieurs cartes CR80 sur feuilles A4 recto / verso */
const LicenseCardA4BatchPrintPage = () => {
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
  const [isPrintReady, setIsPrintReady] = useState(false);

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

  const rectoPages = useMemo(() => chunkCardsForA4(selectedCards), [selectedCards]);
  const versoPages = rectoPages;

  /** Attend le rendu des QR codes avant d'autoriser l'impression */
  useEffect(() => {
    if (selectedCards.length === 0) {
      setIsPrintReady(false);
      return;
    }

    setIsPrintReady(false);
    const timer = window.setTimeout(() => setIsPrintReady(true), 2500);
    return () => window.clearTimeout(timer);
  }, [selectedCards]);

  const handlePrint = useCallback((): void => {
    window.print();
  }, []);

  if (isLoading) {
    return <BrandLoader variant="inline" message="Chargement des cartes..." />;
  }

  if (requestedIds.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-sm" style={{ color: "var(--brand-gray)" }}>
          Aucune carte sélectionnée. Cochez des cartes dans la liste admin puis cliquez sur « Imprimer lot A4 ».
        </p>
        <Link href="/admin/cards" className="text-sm underline" style={{ color: "var(--brand-brown)" }}>
          Retour aux cartes
        </Link>
      </div>
    );
  }

  if (selectedCards.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-sm" style={{ color: "var(--brand-gray)" }}>
          Cartes introuvables. Vérifiez la sélection.
        </p>
        <Link href="/admin/cards" className="text-sm underline" style={{ color: "var(--brand-brown)" }}>
          Retour aux cartes
        </Link>
      </div>
    );
  }

  const pageCount = rectoPages.length;

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .license-a4-print-root,
          .license-a4-print-root * {
            visibility: visible;
          }
          .license-a4-print-toolbar,
          .license-a4-print-instructions,
          .license-a4-page-label {
            display: none !important;
          }
          .license-a4-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .license-a4-sheet {
            page-break-after: always;
            break-after: page;
            margin: 0 auto;
          }
          .license-a4-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
          .license-pvc-card {
            box-shadow: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .license-a4-cut-guide {
            border-color: rgba(0, 0, 0, 0.12) !important;
          }
        }
      `}</style>

      <div className="license-a4-print-toolbar mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/cards"
          className="inline-flex items-center gap-2 text-sm"
          style={{ color: "var(--brand-brown)" }}
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          disabled={!isPrintReady}
          className="inline-flex items-center gap-2 rounded px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-brown)" }}
        >
          <Printer className="h-4 w-4" />
          {isPrintReady ? "Imprimer le lot A4" : "Préparation des QR..."}
        </button>
      </div>

      <div
        className="license-a4-print-instructions mb-6 rounded-lg border border-[#e8ddd4] p-4 text-sm"
        style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-gray)" }}
      >
        <p className="mb-2 font-medium" style={{ color: "var(--brand-brown)" }}>
          Impression lot A4 — bristol + plastification
        </p>
        <ul className="list-inside list-disc space-y-1 text-xs">
          <li>
            <strong>{selectedCards.length} carte(s)</strong> — {pageCount} feuille(s) recto + {pageCount}{" "}
            feuille(s) verso ({CARDS_PER_A4_PAGE} cartes max par feuille)
          </li>
          <li>
            <strong>Étape 1 :</strong> imprimez toutes les pages <strong>RECTO</strong> (marque + app)
          </li>
          <li>
            <strong>Étape 2 :</strong> remettez les feuilles dans l&apos;imprimante, retournez-les sur le{" "}
            <strong>bord long</strong>, imprimez les pages <strong>VERSO</strong> (QR licence)
          </li>
          <li>
            <strong>Étape 3 :</strong> découpez le long des pointillés, plastifiez chaque carte au format CR80
          </li>
          <li>Papier recommandé : bristol 250–300 g/m² ou carte matée</li>
        </ul>
      </div>

      <div className="license-a4-print-root space-y-8 pb-12">
        <section>
          <h3 className="mb-4 text-sm font-semibold print:hidden" style={{ color: "var(--brand-brown)" }}>
            Pages RECTO ({pageCount})
          </h3>
          <div className="flex flex-col items-center gap-8 overflow-x-auto print:overflow-visible">
            {rectoPages.map((pageCards, index) => (
              <LicenseCardA4Sheet
                key={`recto-${index}`}
                cards={pageCards}
                side="recto"
                pageLabel={`Recto — feuille ${index + 1}/${pageCount}`}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-sm font-semibold print:hidden" style={{ color: "var(--brand-brown)" }}>
            Pages VERSO ({pageCount}) — miroir pour duplex bord long
          </h3>
          <div className="flex flex-col items-center gap-8 overflow-x-auto print:overflow-visible">
            {versoPages.map((pageCards, index) => (
              <LicenseCardA4Sheet
                key={`verso-${index}`}
                cards={pageCards}
                side="verso"
                mirrorForDuplex
                pageLabel={`Verso — feuille ${index + 1}/${pageCount}`}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

export default LicenseCardA4BatchPrintPage;
