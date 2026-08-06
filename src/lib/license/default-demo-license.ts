import type { AdminData, AdminLicenseCard } from "@/lib/admin/types";

/** Identifiant stable de la carte démo (admin + Play Store). */
export const DEMO_LICENSE_CARD_ID = "lic-demo-play-store-gandalfifow";

/** Code à saisir dans Gandal Fifow / web NKO — format NKO-XXXX-XXXX. */
export const DEMO_LICENSE_CODE = "NKO-PLAY-DEMO";

/** Secret QR (verso carte) — stable pour tests reproductibles. */
export const DEMO_LICENSE_ACTIVATION_TOKEN =
  "gandalfifowplayreview2026demotoken00000001";

export const DEMO_LICENSE_DURATION_MONTHS = 12 as const;

export interface DemoLicensePublicInfo {
  app_name: string;
  package_id: string;
  license_code: string;
  duration_months: number;
  instructions_fr: string;
  test_profile: {
    name: string;
    phone: string;
    email: string;
    city: string;
    occupation: string;
  };
}

export const getDemoLicensePublicInfo = (): DemoLicensePublicInfo => ({
  app_name: "Gandal Fifow (KARAMOO SEEBALI)",
  package_id: "com.silycore.gandalfifow",
  license_code: DEMO_LICENSE_CODE,
  duration_months: DEMO_LICENSE_DURATION_MONTHS,
  instructions_fr:
    "Ouvrez l'application Gandal Fifow. À l'écran d'activation, choisissez « Code licence » et saisissez le code ci-dessous. " +
    "Complétez le profil avec les informations de test. Cette licence démo est réutilisable par les examinateurs Play Store.",
  test_profile: {
    name: "Examinateur Play Store",
    phone: "620000001",
    email: "review@example.com",
    city: "Conakry",
    occupation: "Test Google Play",
  },
});

/** Carte licence démo créée automatiquement si absente du store. */
export const buildDefaultDemoLicenseCard = (): AdminLicenseCard => ({
  id: DEMO_LICENSE_CARD_ID,
  code_text: DEMO_LICENSE_CODE,
  activation_token: DEMO_LICENSE_ACTIVATION_TOKEN,
  duration_months: DEMO_LICENSE_DURATION_MONTHS,
  status: "unused",
  is_demo_review: true,
  created_at: new Date().toISOString(),
});

export const findDemoLicenseCard = (data: AdminData): AdminLicenseCard | undefined =>
  data.license_cards.find(
    (card) => card.id === DEMO_LICENSE_CARD_ID || card.code_text.toUpperCase() === DEMO_LICENSE_CODE
  );

/** Garantit la présence de la licence démo (VPS existant + nouvelles installs). */
export const ensureDefaultDemoLicenseCard = (
  data: AdminData
): { data: AdminData; changed: boolean } => {
  const existing = findDemoLicenseCard(data);

  if (!existing) {
    return {
      data: {
        ...data,
        license_cards: [...data.license_cards, buildDefaultDemoLicenseCard()],
      },
      changed: true,
    };
  }

  const needsPatch =
    existing.code_text.toUpperCase() !== DEMO_LICENSE_CODE ||
    existing.activation_token !== DEMO_LICENSE_ACTIVATION_TOKEN ||
    existing.is_demo_review !== true ||
    existing.duration_months !== DEMO_LICENSE_DURATION_MONTHS;

  if (!needsPatch) {
    return { data, changed: false };
  }

  const license_cards = data.license_cards.map((card) => {
    if (card.id !== existing.id && card.code_text.toUpperCase() !== DEMO_LICENSE_CODE) return card;
    return {
      ...card,
      id: DEMO_LICENSE_CARD_ID,
      code_text: DEMO_LICENSE_CODE,
      activation_token: DEMO_LICENSE_ACTIVATION_TOKEN,
      duration_months: DEMO_LICENSE_DURATION_MONTHS,
      is_demo_review: true,
    };
  });

  return { data: { ...data, license_cards }, changed: true };
};

/** Libère une licence démo déjà prise (réutilisable par les examinateurs). */
export const releaseDemoLicenseCardForDevice = (
  data: AdminData,
  card: AdminLicenseCard,
  deviceId: string
): boolean => {
  if (!card.is_demo_review || card.status !== "active" || card.device_id === deviceId) {
    return false;
  }

  card.status = "unused";
  card.device_id = undefined;
  card.activated_at = undefined;
  card.expires_at = undefined;

  data.student_auth_sessions = data.student_auth_sessions.filter(
    (session) => session.license_card_id !== card.id
  );
  data.mobile_auth_sessions = data.mobile_auth_sessions.filter(
    (session) => session.license_card_id !== card.id
  );

  return true;
};
