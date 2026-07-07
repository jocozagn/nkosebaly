"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import NkoShell from "./NkoShell";
import BrandLoader from "@/components/ui/BrandLoader";
import NkoCertificateDesign from "./NkoCertificateDesign";

interface CertificateViewPageProps {
  certificateId: string;
}

/** Affichage et impression du certificat */
const CertificateViewPage = ({ certificateId }: CertificateViewPageProps) => {
  const [cert, setCert] = useState<{
    student_name: string;
    course_title: string;
    unique_code: string;
    issued_at?: string;
    verify_url: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/certificates/${certificateId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) {
          setError(res.message ?? "Certificat indisponible");
        } else {
          setCert(res.data);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setError("Erreur de chargement");
        setIsLoading(false);
      });
  }, [certificateId]);

  const handlePrint = (): void => {
    window.print();
  };

  return (
    <NkoShell>
      <style jsx global>{`
        @media print {
          header, footer, nav, .no-print { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="no-print flex items-center justify-between mb-6">
          <Link href="/dashboard/certificates" className="inline-flex items-center gap-2 text-sm hover:underline" style={{ color: "var(--brand-brown)" }}>
            <ArrowLeft className="w-4 h-4" /> Mes certificats
          </Link>
          {cert && (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded text-white"
              style={{ backgroundColor: "var(--brand-brown)" }}
            >
              <Printer className="w-4 h-4" />
              Imprimer / PDF
            </button>
          )}
        </div>

        {isLoading ? (
          <BrandLoader variant="inline" message="Chargement du certificat..." />
        ) : error || !cert ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-sm" style={{ color: "var(--brand-gray)" }}>{error || "Certificat introuvable"}</p>
          </div>
        ) : (
          <NkoCertificateDesign
            studentName={cert.student_name}
            courseTitle={cert.course_title}
            uniqueCode={cert.unique_code}
            issuedAt={cert.issued_at}
            verifyUrl={cert.verify_url}
          />
        )}
      </div>
    </NkoShell>
  );
};

export default CertificateViewPage;
