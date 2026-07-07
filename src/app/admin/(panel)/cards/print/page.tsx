import { Suspense } from "react";
import LicenseCardPrintPage from "@/components/admin/LicenseCardPrintPage";
import BrandLoader from "@/components/ui/BrandLoader";

export default function PrintCardPage() {
  return (
    <Suspense fallback={<BrandLoader variant="inline" message="Chargement..." />}>
      <LicenseCardPrintPage />
    </Suspense>
  );
}
