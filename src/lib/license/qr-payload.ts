/** Payload QR carte licence — lu par l'app mobile au scan */

export interface LicenseQrPayload {
  app: "balandou";
  action: "activate";
  id: string;
  token: string;
}

/** Construit le JSON encodé dans le QR (verso carte PVC uniquement) */
export const buildLicenseQrPayload = (cardId: string, activationToken: string): string =>
  JSON.stringify({
    app: "balandou",
    action: "activate",
    id: cardId,
    token: activationToken,
  } satisfies LicenseQrPayload);

/** Parse le contenu scanné depuis l'app */
export const parseLicenseQrPayload = (raw: string): LicenseQrPayload | null => {
  try {
    const data = JSON.parse(raw) as LicenseQrPayload;
    if (data.app !== "balandou" || data.action !== "activate" || !data.id || !data.token) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
};
