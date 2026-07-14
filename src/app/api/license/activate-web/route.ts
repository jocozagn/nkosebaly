import { NextRequest, NextResponse } from "next/server";
import {
  activateLicenseByCodeText,
  activateLicenseCard,
  linkStudentAuthSession,
  registerStudentProfile,
} from "@/lib/admin/store";
import { validateStudentProfile } from "@/lib/admin/profile";
import type { AdminLicenseCard } from "@/lib/admin/types";
import { parseLicenseQrPayload } from "@/lib/license/qr-payload";
import {
  getAuthToken,
  getDeviceId,
  setLicenseCookies,
  setProfileCompleteCookie,
} from "@/lib/license/require-license";
import { checkRateLimit } from "@/lib/security/rate-limit";

/** Active une carte licence PVC depuis le navigateur web + enregistre le profil */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const rateLimited = checkRateLimit(req, {
    scope: "license-activate-web",
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  const authToken = getAuthToken(req);
  if (!authToken) {
    return NextResponse.json(
      { error: true, message: "Connexion requise" },
      { status: 401 }
    );
  }

  let deviceId = getDeviceId(req);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
  }

  const body = await req.json().catch(() => ({}));
  const qrRaw = String(body?.qr_data ?? "").trim();
  const licenseCode = String(body?.license_code ?? "").trim();

  const profileCheck = validateStudentProfile({
    name: body?.name,
    phone: body?.phone,
    email: body?.email,
    city: body?.city,
    occupation: body?.occupation,
  });

  if (!profileCheck.valid) {
    return NextResponse.json({ error: true, message: profileCheck.message }, { status: 400 });
  }

  if (!qrRaw && !licenseCode) {
    return NextResponse.json(
      { error: true, message: "Code licence (NKO-XXXX-XXXX) ou contenu QR requis" },
      { status: 400 }
    );
  }

  let result:
    | { success: true; card: AdminLicenseCard }
    | { success: false; message: string };

  if (licenseCode) {
    result = await activateLicenseByCodeText(licenseCode, deviceId);
  } else {
    const parsed = parseLicenseQrPayload(qrRaw);
    if (!parsed) {
      return NextResponse.json(
        { error: true, message: "QR code non reconnu. Scannez le verso de votre carte PVC." },
        { status: 400 }
      );
    }
    result = await activateLicenseCard(parsed.id, parsed.token, deviceId);
  }

  if (!result.success) {
    return NextResponse.json({ error: true, message: result.message }, { status: 403 });
  }

  await registerStudentProfile(deviceId, result.card.id, profileCheck.data);
  await linkStudentAuthSession(authToken, deviceId, result.card.id);

  const response = NextResponse.json({
    error: false,
    message: "Licence activée avec succès",
    data: {
      duration_months: result.card.duration_months,
      expires_at: result.card.expires_at,
      activated_at: result.card.activated_at,
      profile: profileCheck.data,
    },
  });

  setLicenseCookies(response, deviceId, result.card.id);
  setProfileCompleteCookie(response);
  return response;
};
