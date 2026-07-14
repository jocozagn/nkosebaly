import { NextRequest, NextResponse } from "next/server";
import { getActiveLicenseByMobileToken } from "@/lib/admin/store";
import type { AdminLicenseCard, AdminUser } from "@/lib/admin/types";

export const MOBILE_TOKEN_HEADER = "x-mobile-token";

/** @deprecated Auth mobile par device_id supprimée — utiliser X-Mobile-Token uniquement. */
export const DEVICE_HEADER = "x-device-id";

export type MobileDeviceResult =
  | { ok: true; deviceId: string; card: AdminLicenseCard; user: AdminUser | null }
  | { ok: false; response: NextResponse };

/** Valide la licence via le token mobile (session créée à l'activation). */
export const requireMobileDevice = async (req: NextRequest): Promise<MobileDeviceResult> => {
  const mobileToken = req.headers.get(MOBILE_TOKEN_HEADER)?.trim();
  if (!mobileToken) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: true,
          message: "Session mobile requise. Réactivez votre carte depuis l'application.",
          code: "MOBILE_TOKEN_REQUIRED",
        },
        { status: 401 }
      ),
    };
  }

  const license = await getActiveLicenseByMobileToken(mobileToken);
  if (!license) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: true,
          message: "Session mobile invalide ou expirée. Réactivez votre carte.",
          code: "MOBILE_TOKEN_REQUIRED",
        },
        { status: 403 }
      ),
    };
  }

  const stableDeviceId = license.user?.device_id ?? license.card.device_id ?? mobileToken;
  return { ok: true, deviceId: stableDeviceId, card: license.card, user: license.user };
};
