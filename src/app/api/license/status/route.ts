import { NextRequest, NextResponse } from "next/server";
import {
  activateLicenseCard,
  getFirstUnusedLicenseCard,
  getStudentAuthSessionByToken,
  getStudentLicenseByAuthToken,
  getStudentUserByAuthToken,
  isStudentProfileComplete,
  linkStudentAuthSession,
} from "@/lib/admin/store";
import { parseLicenseQrPayload } from "@/lib/license/qr-payload";
import {
  DEVICE_COOKIE,
  clearLicenseCookies,
  getAuthToken,
  getDeviceId,
  setLicenseCookies,
} from "@/lib/license/require-license";

/** État de la licence liée à la session web */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const authToken = getAuthToken(req);
  if (!authToken) {
    return NextResponse.json(
      { error: true, message: "Connexion requise", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const session = await getStudentAuthSessionByToken(authToken);
  if (!session) {
    const { clearStudentWebSessionCookies } = await import("@/lib/license/cookies");
    const response = NextResponse.json({
      error: false,
      data: { active: false, session_revoked: true },
    });
    clearStudentWebSessionCookies(response);
    return response;
  }

  const license = await getStudentLicenseByAuthToken(authToken);
  if (!license) {
    const response = NextResponse.json({
      error: false,
      data: { active: false },
    });
    clearLicenseCookies(response);
    return response;
  }

  const user = await getStudentUserByAuthToken(authToken);
  const response = NextResponse.json({
    error: false,
    data: {
      active: true,
      duration_months: license.card.duration_months,
      activated_at: license.card.activated_at,
      expires_at: license.card.expires_at,
      code_text: license.card.code_text,
      profile_completed: user ? isStudentProfileComplete(user) : false,
    },
  });

  if (user && isStudentProfileComplete(user)) {
    const { setProfileCompleteCookie } = await import("@/lib/license/cookies");
    setProfileCompleteCookie(response);
  }

  return response;
};

/** Assure un identifiant appareil navigateur (cookie) */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const existing = getDeviceId(req);
  const deviceId = existing ?? crypto.randomUUID();

  const response = NextResponse.json({ error: false, data: { device_id: deviceId } });
  if (!existing) {
    response.cookies.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
  }
  return response;
};
