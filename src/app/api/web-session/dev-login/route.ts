import { NextResponse } from "next/server";
import { setLicenseCookies, setProfileCompleteCookie } from "@/lib/license/cookies";
import { setupDevLicenseForToken } from "@/lib/license/dev-setup";

/**
 * Connexion de test sans APK — active aussi licence + profil en une étape.
 */
export const POST = async (): Promise<NextResponse> => {
  const isDev = process.env.NODE_ENV === "development";
  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS === "true";

  if (!isDev && !devBypass) {
    return NextResponse.json(
      { error: true, message: "Mode test non disponible" },
      { status: 403 }
    );
  }

  const testToken = `dev-test-${crypto.randomUUID()}`;
  const deviceId = crypto.randomUUID();

  const setup = await setupDevLicenseForToken(testToken, deviceId);

  const response = NextResponse.json({
    error: false,
    message: setup.ok ? "Connexion test + licence activées" : "Connexion test réussie",
    data: setup.ok
      ? { license_activated: true, code_text: setup.codeText }
      : { license_activated: false },
  });

  response.cookies.set("auth_token", testToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  });

  if (setup.ok) {
    setLicenseCookies(response, deviceId, setup.cardId);
    setProfileCompleteCookie(response);
  }

  return response;
};
