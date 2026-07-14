import { NextRequest, NextResponse } from "next/server";
import { createMobileAuthSession, getActiveLicenseByDeviceId } from "@/lib/admin/store";
import { checkRateLimit } from "@/lib/security/rate-limit";

/**
 * Restaure une session mobile après réinstallation de l'app.
 * La licence reste liée au device_id (Android ID) mais le token local est effacé.
 */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const rateLimited = checkRateLimit(req, {
    scope: "mobile-restore-session",
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  const deviceId = req.headers.get("x-device-id")?.trim();
  if (!deviceId) {
    return NextResponse.json(
      { error: true, message: "X-Device-Id requis", code: "DEVICE_ID_REQUIRED" },
      { status: 401 }
    );
  }

  const license = await getActiveLicenseByDeviceId(deviceId);
  if (!license) {
    return NextResponse.json(
      {
        error: true,
        message: "Aucune licence active sur cet appareil. Scannez votre carte PVC.",
        code: "LICENSE_NOT_FOUND",
      },
      { status: 403 }
    );
  }

  const mobileSession = await createMobileAuthSession(license.card.id);

  return NextResponse.json({
    error: false,
    message: "Session mobile restaurée",
    data: {
      mobile_token: mobileSession.mobile_token,
      expires_at: license.card.expires_at,
      duration_months: license.card.duration_months,
      user_name: license.user?.name ?? "",
    },
  });
};
