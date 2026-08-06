import Link from "next/link";
import NkoShell from "@/components/nko/NkoShell";
import { BRAND } from "@/constants/brand";

/** Politique de confidentialité — web NKO + application mobile Adlam (Gandal Fifow). */
const PrivacyPolicyPage = () => {
  const updatedAt = "6 août 2026";

  return (
    <NkoShell showNav={false}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex text-sm mb-6 hover:underline"
          style={{ color: "var(--brand-brown)" }}
        >
          ← Retour à l&apos;accueil
        </Link>

        <header className="mb-8 space-y-2">
          <p className="font-nko text-lg font-semibold" style={{ color: "var(--brand-brown)" }}>
            {BRAND.nameNko}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--brand-brown-dark)" }}>
            Politique de confidentialité
          </h1>
          <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
            Plateforme {BRAND.name} · Application mobile Adlam ({BRAND.nameNko}) · Dernière mise à jour : {updatedAt}
          </p>
        </header>

        <article className="bg-white rounded-lg border border-[#e8ddd4] p-6 sm:p-8 shadow-sm space-y-6 text-sm sm:text-base leading-relaxed text-[var(--brand-gray-dark)]">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold" style={{ color: "var(--brand-brown)" }}>
              1. Responsable du traitement
            </h2>
            <p>
              {BRAND.professor.french} ({BRAND.professor.nko}), fondateur de {BRAND.name}, est responsable du traitement
              des données liées à la plateforme d&apos;apprentissage et à l&apos;application mobile distribuée sous le
              nom <strong>Gandal Fifow</strong> (identifiant Android : <code className="text-xs">com.silycore.gandalfifow</code>
              ).
            </p>
            <p>
              Contact :{" "}
              <a href={`mailto:${BRAND.contact.email}`} className="underline" style={{ color: "var(--brand-brown)" }}>
                {BRAND.contact.email}
              </a>{" "}
              · {BRAND.contact.phoneDisplay}
            </p>
            <p className="text-xs text-[var(--brand-gray)]">
              Développement technique : {BRAND.silycore.name} ({BRAND.silycore.phoneDisplay})
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold" style={{ color: "var(--brand-brown)" }}>
              2. Données collectées
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Identité et profil : nom, téléphone, e-mail, ville, profession (si renseignés).</li>
              <li>Licence / accès : code licence, identifiant appareil, jetons de session web et mobile.</li>
              <li>Apprentissage : progression des leçons, scores de quiz, certificats obtenus.</li>
              <li>Engagement : questions, réactions (likes), documents consultés dans les leçons.</li>
              <li>Paiements (certificats) : références de transaction via prestataires sécurisés (ex. Djomy).</li>
              <li>Technique : logs serveur, adresse IP, type d&apos;appareil, pour la sécurité et le support.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold" style={{ color: "var(--brand-brown)" }}>
              3. Finalités
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Activer et gérer votre accès aux cours (web et mobile).</li>
              <li>Suivre votre progression et délivrer les certificats.</li>
              <li>Protéger les contenus pédagogiques (vidéos, documents).</li>
              <li>Assurer le support, la facturation des certificats et la conformité légale.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold" style={{ color: "var(--brand-brown)" }}>
              4. Application mobile Adlam
            </h2>
            <p>
              L&apos;application <strong>Gandal Fifow</strong> communique avec les serveurs {BRAND.name} via connexion
              chiffrée (HTTPS). Les vidéos téléchargées pour lecture hors ligne sont stockées de manière chiffrée sur
              votre appareil et ne sont pas exportables. La capture d&apos;écran peut être restreinte pour protéger
              les contenus pédagogiques.
            </p>
            <p>
              Permissions utilisées : Internet, appareil photo (scan QR licence), stockage local sécurisé pour la
              session et les contenus hors ligne.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold" style={{ color: "var(--brand-brown)" }}>
              5. Cookies et session web
            </h2>
            <p>
              Le site utilise des cookies strictement nécessaires à la connexion (session élève après scan QR) et à la
              sécurité. Aucune publicité ciblée n&apos;est diffusée via ces cookies.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold" style={{ color: "var(--brand-brown)" }}>
              6. Durée de conservation
            </h2>
            <p>
              Les données de compte et de progression sont conservées tant que votre licence est active et pendant la
              durée nécessaire aux obligations légales et comptables. Les journaux techniques sont conservés pour une
              durée limitée (sécurité).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold" style={{ color: "var(--brand-brown)" }}>
              7. Vos droits
            </h2>
            <p>
              Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données personnelles, dans
              la limite des obligations légales, en écrivant à{" "}
              <a href={`mailto:${BRAND.contact.email}`} className="underline" style={{ color: "var(--brand-brown)" }}>
                {BRAND.contact.email}
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold" style={{ color: "var(--brand-brown)" }}>
              8. Partage des données
            </h2>
            <p>
              Vos données ne sont pas vendues. Elles peuvent être traitées par {BRAND.silycore.name} (hébergement,
              maintenance) et par les prestataires de paiement uniquement pour finaliser vos achats de certificats.
            </p>
          </section>
        </article>
      </div>
    </NkoShell>
  );
};

export default PrivacyPolicyPage;
