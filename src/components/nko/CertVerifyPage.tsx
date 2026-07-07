"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Award, CheckCircle, XCircle } from "lucide-react";
import BrandLoader from "@/components/ui/BrandLoader";
import { BRAND } from "@/constants/brand";

interface CertData {
  unique_code: string;
  student_name: string;
  course_title: string;
  issued_at?: string;
  valid: boolean;
}

interface CertVerifyPageProps {
  code: string;
}

/** Page publique de vérification de certificat */
const CertVerifyPage = ({ code }: CertVerifyPageProps) => {
  const [cert, setCert] = useState<CertData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    fetch(`/api/certificates/verify/${code}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) {
          setCert(res.data);
          setIsValid(true);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 font-[family-name:var(--font-dm-sans)]" style={{ backgroundColor: "var(--brand-bg)" }}>
      <div className="w-full max-w-md bg-white rounded-lg border border-[#e8ddd4] shadow-sm p-8 text-center">
        <Image src={BRAND.logo} alt={BRAND.name} width={64} height={64} className="mx-auto h-16 w-16 rounded-full object-cover ring-2 ring-[var(--brand-gold)] mb-4" />

        {isLoading ? (
          <BrandLoader compact message="Vérification en cours..." />
        ) : isValid && cert ? (
          <>
            <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--brand-green)" }} />
            <h1 className="text-xl font-bold mb-1" style={{ color: "var(--brand-brown)" }}>Certificat valide</h1>
            <p className="text-sm mb-6" style={{ color: "var(--brand-gray)" }}>Ce certificat est authentique</p>
            <div className="text-left space-y-3 text-sm border-t border-[#f0e8df] pt-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" style={{ color: "var(--brand-gold)" }} />
                <span className="font-mono text-xs" style={{ color: "var(--brand-brown)" }}>{cert.unique_code}</span>
              </div>
              <p><span style={{ color: "var(--brand-gray)" }}>Étudiant :</span> <strong>{cert.student_name}</strong></p>
              <p><span style={{ color: "var(--brand-gray)" }}>Cours :</span> <strong>{cert.course_title}</strong></p>
              {cert.issued_at && (
                <p><span style={{ color: "var(--brand-gray)" }}>Émis le :</span> {new Date(cert.issued_at).toLocaleDateString("fr-FR")}</p>
              )}
            </div>
          </>
        ) : (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
            <h1 className="text-xl font-bold mb-1" style={{ color: "var(--brand-brown)" }}>Certificat invalide</h1>
            <p className="text-sm" style={{ color: "var(--brand-gray)" }}>Ce code de vérification n&apos;existe pas ou a expiré.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default CertVerifyPage;
