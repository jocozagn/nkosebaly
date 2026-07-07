import {
  activateLicenseCard,
  getFirstUnusedLicenseCard,
  linkStudentAuthSession,
  registerStudentProfile,
} from "@/lib/admin/store";

export interface DevLicenseSetupResult {
  ok: true;
  cardId: string;
  codeText: string;
}

/** Active une carte test + profil élève pour le mode développement */
export const setupDevLicenseForToken = async (
  authToken: string,
  deviceId: string
): Promise<DevLicenseSetupResult | { ok: false }> => {
  const card = await getFirstUnusedLicenseCard();
  if (!card) return { ok: false };

  const result = await activateLicenseCard(card.id, card.activation_token, deviceId);
  if (!result.success) return { ok: false };

  await registerStudentProfile(
    deviceId,
    result.card.id,
    {
      name: "Élève Test",
      phone: "620000000",
      city: "Conakry",
      occupation: "Mode développement",
    },
    { notifyAdmin: false }
  );

  await linkStudentAuthSession(authToken, deviceId, result.card.id);

  return {
    ok: true,
    cardId: result.card.id,
    codeText: result.card.code_text,
  };
};
