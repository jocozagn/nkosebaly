"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award } from "lucide-react";
import NkoShell from "./NkoShell";
import BrandLoader from "@/components/ui/BrandLoader";
import CertificateRequestCard, { type CertificateEligibility } from "./CertificateRequestCard";

interface CertItem {
  id: string;
  course_title: string;
  unique_code: string;
  payment_status: string;
  issued_at?: string;
}

/** Mes certificats et demandes */
const MyCertificatesPage = () => {
  const [certificates, setCertificates] = useState<CertItem[]>([]);
  const [eligibility, setEligibility] = useState<CertificateEligibility[]>([]);
  const [issuedCount, setIssuedCount] = useState(0);
  const [certificatePrice, setCertificatePrice] = useState(50000);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = (): void => {
    setIsLoading(true);
    fetch("/api/certificates/my")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) {
          setCertificates(res.data.certificates ?? []);
          setEligibility(res.data.eligibility ?? []);
          setIssuedCount(res.data.issued_count ?? 0);
          setCertificatePrice(res.data.certificate_price ?? 50000);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const eligibleToRequest = eligibility.filter((e) => e.eligible && e.status === "none");
  const pending = eligibility.filter((e) => e.status === "pending");
  const issued = eligibility.filter((e) => e.status === "issued");

  return (
    <NkoShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm mb-6 hover:underline" style={{ color: "var(--brand-brown)" }}>
          <ArrowLeft className="w-4 h-4" /> Tableau de bord
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Award className="w-7 h-7" style={{ color: "var(--brand-gold)" }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--brand-brown)" }}>Mes certificats</h1>
            <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
              {issuedCount} certificat{issuedCount > 1 ? "s" : ""} délivré{issuedCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {isLoading ? (
          <BrandLoader variant="inline" message="Chargement..." />
        ) : (
          <div className="space-y-6">
            {eligibleToRequest.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold" style={{ color: "var(--brand-brown)" }}>
                  Certificats à obtenir
                </h2>
                {eligibleToRequest.map((item) => (
                  <CertificateRequestCard
                    key={item.course_id}
                    item={item}
                    onUpdated={loadData}
                    certificatePrice={certificatePrice}
                  />
                ))}
              </section>
            )}

            {pending.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold" style={{ color: "var(--brand-brown)" }}>En attente</h2>
                {pending.map((item) => (
                  <CertificateRequestCard
                    key={item.course_id}
                    item={item}
                    onUpdated={loadData}
                    certificatePrice={certificatePrice}
                  />
                ))}
              </section>
            )}

            {issued.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold" style={{ color: "var(--brand-brown)" }}>Délivrés</h2>
                {issued.map((item) => (
                  <CertificateRequestCard key={item.course_id} item={item} />
                ))}
              </section>
            )}

            {eligibleToRequest.length === 0 && pending.length === 0 && issued.length === 0 && (
              <div className="bg-white rounded-lg border border-dashed border-[#d4c4b5] p-10 text-center">
                <Award className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--brand-tan)" }} />
                <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
                  Terminez un cours et réussissez son quiz pour demander un certificat.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </NkoShell>
  );
};

export default MyCertificatesPage;
