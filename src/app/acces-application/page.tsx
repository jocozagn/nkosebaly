import type { Metadata } from "next";
import Link from "next/link";
import NkoShell from "@/components/nko/NkoShell";
import { getDemoLicensePublicInfo } from "@/lib/license/default-demo-license";

export const metadata: Metadata = {
  title: "Accès test · Gandal Fifow",
  description: "Instructions et code licence démo pour Google Play et tests admin.",
};

/** Page publique pour Play Console (accès application) et support. */
export default function AppAccessPage() {
  const info = getDemoLicensePublicInfo();

  return (
    <NkoShell showNav={false}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex text-sm mb-6 hover:underline"
          style={{ color: "var(--brand-brown)" }}
        >
          ← Accueil
        </Link>

        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--brand-brown-dark)" }}>
          Accès test — {info.app_name}
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--brand-gray)" }}>
          {info.instructions_fr}
        </p>

        <div className="bg-white rounded-lg border border-[#e8ddd4] p-6 space-y-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-gray)]">
              Code licence
            </p>
            <p className="text-2xl font-mono font-bold mt-1" style={{ color: "var(--brand-brown)" }}>
              {info.license_code}
            </p>
            <p className="text-xs mt-1 text-[var(--brand-gray)]">
              Durée : {info.duration_months} mois · Package Android : {info.package_id}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-gray)] mb-2">
              Profil de test suggéré
            </p>
            <ul className="text-sm space-y-1 text-[var(--brand-gray-dark)]">
              <li>
                <strong>Nom :</strong> {info.test_profile.name}
              </li>
              <li>
                <strong>Téléphone :</strong> {info.test_profile.phone}
              </li>
              <li>
                <strong>E-mail :</strong> {info.test_profile.email}
              </li>
              <li>
                <strong>Ville :</strong> {info.test_profile.city}
              </li>
              <li>
                <strong>Profession :</strong> {info.test_profile.occupation}
              </li>
            </ul>
          </div>

          <p className="text-xs text-[var(--brand-gray)]">
            Cette licence est marquée « démo » : elle peut être réutilisée par un nouvel examinateur (l&apos;activation
            sur un autre appareil libère l&apos;ancienne session).
          </p>
        </div>
      </div>
    </NkoShell>
  );
}
