import { NextRequest, NextResponse } from "next/server";
import { getAuthToken, getDeviceId, setLicenseCookies, setProfileCompleteCookie } from "@/lib/license/cookies";
import { setupDevLicenseForToken } from "@/lib/license/dev-setup";

/** Mode test : active automatiquement une carte non utilisée + profil */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const isDev = process.env.NODE_ENV === "development";
  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS === "true";

  if (!isDev && !devBypass) {
    return NextResponse.json({ error: true, message: "Non disponible" }, { status: 403 });
  }

  const authToken = getAuthToken(req);
  if (!authToken) {
    return NextResponse.json({ error: true, message: "Connexion requise" }, { status: 401 });
  }

  const deviceId = getDeviceId(req) ?? crypto.randomUUID();
  const setup = await setupDevLicenseForToken(authToken, deviceId);

  if (!setup.ok) {
    return NextResponse.json(
      { error: true, message: "Aucune carte test disponible. Générez-en dans l'admin." },
      { status: 404 }
    );
  }

  const response = NextResponse.json({
    error: false,
    message: "Carte test activée",
    data: {
      code_text: setup.codeText,
    },
  });

  setLicenseCookies(response, deviceId, setup.cardId);
  setProfileCompleteCookie(response);
  return response;
};
