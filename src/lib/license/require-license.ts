import { NextRequest, NextResponse } from "next/server";
import { getStudentLicenseByAuthToken } from "@/lib/admin/store";
import type { AdminLicenseCard } from "@/lib/admin/types";

export {
  DEVICE_COOKIE,
  LICENSE_COOKIE,
  PROFILE_COOKIE,
  clearLicenseCookies,
  getAuthToken,
  getDeviceId,
  setLicenseCookies,
  setProfileCompleteCookie,
} from "@/lib/license/cookies";

export type LicenseAccessResult =
  | { ok: true; authToken: string; card: AdminLicenseCard }
  | { ok: false; response: NextResponse };

/** Bloque l'accès si l'élève n'a pas de licence active (runtime Node uniquement) */
export const requireActiveLicense = async (req: NextRequest): Promise<LicenseAccessResult> => {
  const authToken = req.cookies.get("auth_token")?.value ?? null;
  if (!authToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: true, message: "Connexion requise", code: "AUTH_REQUIRED" },
        { status: 401 }
      ),
    };
  }

  const license = await getStudentLicenseByAuthToken(authToken);
  if (!license) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: true, message: "Licence requise", code: "LICENSE_REQUIRED" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, authToken, card: license.card };
};
