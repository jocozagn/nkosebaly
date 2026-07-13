import { Suspense } from "react";
import LicenseCardA4BatchPrintPage from "@/components/admin/LicenseCardA4BatchPrintPage";
import BrandLoader from "@/components/ui/BrandLoader";

/** Impression lot cartes licence sur feuilles A4 */
export default function PrintBatchCardsPage() {
  return (
    <Suspense fallback={<BrandLoader variant="inline" message="Chargement..." />}>
      <LicenseCardA4BatchPrintPage />
    </Suspense>
  );
}
