import { Suspense } from "react";
import LicenseCardPngExportPage from "@/components/admin/LicenseCardPngExportPage";
import BrandLoader from "@/components/ui/BrandLoader";

export default function ExportPngPage() {
  return (
    <Suspense fallback={<BrandLoader variant="inline" message="Chargement..." />}>
      <LicenseCardPngExportPage />
    </Suspense>
  );
}
