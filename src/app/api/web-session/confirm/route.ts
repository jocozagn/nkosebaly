import { NextRequest, NextResponse } from "next/server";
import { getActiveLicenseByDeviceId, getActiveLicenseByMobileToken } from "@/lib/admin/store";
import { confirmWebSession } from "@/lib/webSessionStore";

/** L'app mobile confirme le scan du QR web (auth via X-Mobile-Token) */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = (await request.json().catch(() => ({}))) as {
    session_token?: string;
    device_id?: string;
    mobile_token?: string;
  };

  const sessionToken = body.session_token?.trim();
  if (!sessionToken) {
    return NextResponse.json(
      { error: true, message: "session_token requis" },
      { status: 400 }
    );
  }

  // Priorité : token mobile (auth actuelle après activation carte PVC)
  const mobileToken =
    request.headers.get("x-mobile-token")?.trim() || body.mobile_token?.trim() || "";

  const mobileLicense = mobileToken
    ? await getActiveLicenseByMobileToken(mobileToken)
    : null;

  // Rétrocompatibilité : anciennes apps qui n'envoient que device_id
  const fallbackDeviceId = body.device_id?.trim();
  const deviceLicense =
    !mobileLicense && fallbackDeviceId
      ? await getActiveLicenseByDeviceId(fallbackDeviceId)
      : null;

  const license = mobileLicense ?? deviceLicense;

  if (!license) {
    return NextResponse.json(
      {
        error: true,
        message:
          "Aucune licence active sur cet appareil. Activez d'abord votre carte PVC dans l'application.",
      },
      { status: 403 }
    );
  }

  const deviceId =
    license.user?.device_id?.trim() ||
    license.card.device_id?.trim() ||
    fallbackDeviceId ||
    `card-${license.card.id}`;

  const result = await confirmWebSession(sessionToken, {
    deviceId,
    licenseCardId: license.card.id,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: true, message: result.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    error: false,
    message: result.message,
    data: { auth_token: result.authToken },
  });
};
