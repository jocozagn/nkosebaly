import { NextRequest, NextResponse } from "next/server";
import { getActiveLicenseByDeviceId, getActiveLicenseByMobileToken } from "@/lib/admin/store";
import type { AdminLicenseCard, AdminUser } from "@/lib/admin/types";

export const DEVICE_HEADER = "x-device-id";
export const MOBILE_TOKEN_HEADER = "x-mobile-token";

export type MobileDeviceResult =
  | { ok: true; deviceId: string; card: AdminLicenseCard; user: AdminUser | null }
  | { ok: false; response: NextResponse };

/** Valide la licence via l'identifiant appareil (app mobile) */
export const requireMobileDevice = async (req: NextRequest): Promise<MobileDeviceResult> => {
  // Nouveau: token mobile (prioritaire)
  const mobileToken = req.headers.get(MOBILE_TOKEN_HEADER)?.trim();
  if (mobileToken) {
    const license = await getActiveLicenseByMobileToken(mobileToken);
    if (!license) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: true, message: "Session mobile invalide ou expirée", code: "MOBILE_TOKEN_REQUIRED" },
          { status: 403 }
        ),
      };
    }
    // Important: beaucoup de fonctions existantes utilisent encore deviceId pour la progression.
    // On renvoie donc un deviceId stable (celui stocké sur l'utilisateur) quand disponible.
    const stableDeviceId = license.user?.device_id ?? license.card.device_id ?? mobileToken;
    return { ok: true, deviceId: stableDeviceId, card: license.card, user: license.user };
  }

  const deviceId = req.headers.get(DEVICE_HEADER)?.trim();
  if (!deviceId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: true, message: "X-Mobile-Token requis", code: "MOBILE_TOKEN_REQUIRED" },
        { status: 401 }
      ),
    };
  }

  const license = await getActiveLicenseByDeviceId(deviceId);
  if (!license) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: true, message: "Licence invalide ou expirée", code: "LICENSE_REQUIRED" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    deviceId,
    card: license.card,
    user: license.user,
  };
};
