import { NextRequest, NextResponse } from "next/server";
import { getActiveLicenseByDeviceId } from "@/lib/admin/store";
import type { AdminLicenseCard, AdminUser } from "@/lib/admin/types";

export const DEVICE_HEADER = "x-device-id";

export type MobileDeviceResult =
  | { ok: true; deviceId: string; card: AdminLicenseCard; user: AdminUser | null }
  | { ok: false; response: NextResponse };

/** Valide la licence via l'identifiant appareil (app mobile) */
export const requireMobileDevice = async (req: NextRequest): Promise<MobileDeviceResult> => {
  const deviceId = req.headers.get(DEVICE_HEADER)?.trim();
  if (!deviceId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: true, message: "X-Device-Id requis", code: "DEVICE_REQUIRED" },
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
