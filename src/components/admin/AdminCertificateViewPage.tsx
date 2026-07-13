"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Printer } from "lucide-react";
import NkoCertificateDesign from "@/components/nko/NkoCertificateDesign";
import BrandLoader from "@/components/ui/BrandLoader";

interface AdminCertificateViewPageProps {
  certificateId: string;
}

/** Aperçu et impression PDF certificat — accès admin */
const AdminCertificateViewPage = ({ certificateId }: AdminCertificateViewPageProps) => {
  const [cert, setCert] = useState<{
    student_name: string;
    course_title: string;
    unique_code: string;
    issued_at?: string;
    verify_url: string;
    payment_status: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/certificates/${certificateId}`)
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

  const canPrint = cert?.payment_status === "paid";

  return (
    <>
      <style jsx global>{`
        @media print {
          aside,
          header,
          nav,
          .admin-cert-print-toolbar,
          .admin-mobile-menu-btn {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
          .lg\\:pl-64 {
            padding-left: 0 !important;
          }
          body {
            background: white !important;
          }
          #nko-certificate {
            box-shadow: none !important;
            max-width: 100% !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="admin-cert-print-toolbar mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/certificates"
          className="inline-flex items-center gap-2 text-sm"
          style={{ color: "var(--brand-brown)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux certificats
        </Link>

        {cert && canPrint ? (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={cert.verify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded border border-[#e8ddd4] px-4 py-2 text-sm"
              style={{ color: "var(--brand-brown)" }}
            >
              Vérification publique
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--brand-brown)" }}
            >
              <Printer className="h-4 w-4" />
              Imprimer / Enregistrer en PDF
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <BrandLoader variant="inline" message="Chargement du certificat..." />
      ) : error || !cert ? (
        <div className="rounded-lg border border-[#e8ddd4] bg-white p-8 text-center">
          <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
            {error || "Certificat introuvable"}
          </p>
        </div>
      ) : !canPrint ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-sm text-amber-900">
            Ce certificat est encore en attente. Approuvez-le d&apos;abord pour l&apos;imprimer.
          </p>
        </div>
      ) : (
        <>
          <div
            className="admin-cert-print-toolbar mb-4 rounded-lg border border-[#e8ddd4] p-3 text-xs"
            style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-gray)" }}
          >
            <p>
              <strong>Astuce :</strong> cliquez sur « Imprimer / Enregistrer en PDF », puis choisissez{' '}
              <strong>Enregistrer au format PDF</strong> comme destination d&apos;impression.
            </p>
          </div>
          <NkoCertificateDesign
            studentName={cert.student_name}
            courseTitle={cert.course_title}
            uniqueCode={cert.unique_code}
            issuedAt={cert.issued_at}
            verifyUrl={cert.verify_url}
          />
        </>
      )}
    </>
  );
};

export default AdminCertificateViewPage;
