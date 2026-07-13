import { Suspense } from "react";
import AdminCertificateViewPage from "@/components/admin/AdminCertificateViewPage";
import BrandLoader from "@/components/ui/BrandLoader";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Aperçu / impression certificat élève (admin) */
export default async function AdminCertificatePrintPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<BrandLoader variant="inline" message="Chargement..." />}>
      <AdminCertificateViewPage certificateId={id} />
    </Suspense>
  );
}
