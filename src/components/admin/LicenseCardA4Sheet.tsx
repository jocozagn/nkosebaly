"use client";

import LicenseCardPvcDesign from "@/components/admin/LicenseCardPvcDesign";
import { A4_PRINT, CARDS_PER_A4_PAGE, getA4SlotPosition } from "@/lib/license/a4-print-layout";
import type { AdminLicenseCard } from "@/lib/admin/types";

interface LicenseCardA4SheetProps {
  /** Cartes de la page (max 10). Les emplacements vides restent blancs. */
  cards: (AdminLicenseCard | null)[];
  side: "recto" | "verso";
  /** Numéro de page affiché dans l'aperçu écran */
  pageLabel?: string;
  /** Verso miroir pour impression duplex (retournement bord long) */
  mirrorForDuplex?: boolean;
}

/**
 * Une feuille A4 avec jusqu'à 10 cartes CR80 (2×5).
 * Utilisée pour impression bristol + découpe + plastification.
 */
const LicenseCardA4Sheet = ({
  cards,
  side,
  pageLabel,
  mirrorForDuplex = false,
}: LicenseCardA4SheetProps) => {
  const slots = Array.from({ length: CARDS_PER_A4_PAGE }, (_, slotIndex) => {
    const card = cards[slotIndex] ?? null;
    const pos = getA4SlotPosition(slotIndex, {
      mirrorColumns: mirrorForDuplex && side === "verso",
    });
    return { card, pos };
  });

  return (
    <div
      className="license-a4-sheet relative mx-auto bg-white shadow-md print:shadow-none"
      style={{
        width: `${A4_PRINT.pageWidthMm}mm`,
        height: `${A4_PRINT.pageHeightMm}mm`,
      }}
      data-side={side}
    >
      {pageLabel ? (
        <p
          className="license-a4-page-label absolute left-0 top-0 z-10 px-2 py-1 text-[10px] print:hidden"
          style={{ color: "var(--brand-gray)" }}
        >
          {pageLabel}
        </p>
      ) : null}

      {slots.map(({ card, pos }) => (
        <div
          key={`${side}-${pos.slotIndex}`}
          className="license-a4-card-slot absolute overflow-hidden"
          style={{
            left: `${pos.leftMm}mm`,
            top: `${pos.topMm}mm`,
            width: `${A4_PRINT.cardWidthMm}mm`,
            height: `${A4_PRINT.cardHeightMm}mm`,
          }}
        >
          {/* Repères de découpe — visibles à l'écran et à l'impression */}
          <div
            className="license-a4-cut-guide pointer-events-none absolute inset-0 rounded-[3mm] border border-dashed"
            style={{ borderColor: "rgba(125, 78, 45, 0.35)" }}
            aria-hidden
          />

          {card ? (
            <LicenseCardPvcDesign card={card} side={side} className="h-full w-full" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center rounded-[3mm] border border-dashed text-[2mm]"
              style={{ borderColor: "#e8ddd4", color: "var(--brand-gray)" }}
            >
              <span className="print:hidden">Vide</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default LicenseCardA4Sheet;
