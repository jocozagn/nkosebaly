import { NextRequest, NextResponse } from "next/server";
import {
  getActiveLicenseByDeviceId,
  isLicenseCardValid,
  isStudentProfileComplete,
  linkStudentAuthSession,
  readAdminData,
} from "@/lib/admin/store";
import { getCookieWriteOptions } from "@/lib/cookie-options";
import {
  setLicenseCookies,
  setProfileCompleteCookie,
} from "@/lib/license/cookies";
import { getWebSession } from "@/lib/webSessionStore";

/** Le navigateur finalise la connexion après confirmation mobile */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = (await request.json().catch(() => ({}))) as { token?: string };
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json(
      { error: true, message: "token requis" },
      { status: 400 }
    );
  }

  const session = await getWebSession(token);

  if (!session || session.status !== "confirmed" || !session.authToken) {
    return NextResponse.json(
      { error: true, message: "Session non confirmée ou expirée" },
      { status: 400 }
    );
  }

  const cookieOpts = getCookieWriteOptions(request);
  const response = NextResponse.json({
    error: false,
    message: "Connexion réussie",
    data: { redirect: "/dashboard" },
  });

  response.cookies.set("auth_token", session.authToken, {
    httpOnly: true,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });

  // Carte licence confirmée par l'app mobile lors du scan QR
  let licenseCardId = session.licenseCardId;
  let deviceId = session.deviceId;

  // Rétrocompatibilité : anciennes sessions sans licenseCardId
  if (!licenseCardId && deviceId) {
    const license = await getActiveLicenseByDeviceId(deviceId);
    if (license) {
      licenseCardId = license.card.id;
      deviceId = license.card.device_id?.trim() || deviceId;
    }
  }

  if (!licenseCardId || !deviceId) {
    return NextResponse.json(
      {
        error: true,
        message:
          "Licence non liée. Rescannez le QR depuis l'application avec une carte déjà activée.",
      },
      { status: 400 }
    );
  }

  const data = await readAdminData();
  const card = data.license_cards.find((item) => item.id === licenseCardId);

  if (!card || !isLicenseCardValid(card)) {
    return NextResponse.json(
      { error: true, message: "Licence expirée ou invalide" },
      { status: 403 }
    );
  }

  await linkStudentAuthSession(session.authToken, deviceId, licenseCardId);
  setLicenseCookies(response, deviceId, licenseCardId, cookieOpts);

  const user = data.users.find((item) => item.license_card_id === licenseCardId);
  if (user && isStudentProfileComplete(user)) {
    setProfileCompleteCookie(response, cookieOpts);
  }

  return response;
};
