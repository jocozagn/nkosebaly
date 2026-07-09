import { NextRequest, NextResponse } from "next/server";
import { activateLicenseCard, createMobileAuthSession, registerStudentProfile } from "@/lib/admin/store";
import { validateStudentProfile } from "@/lib/admin/profile";
import { parseLicenseQrPayload } from "@/lib/license/qr-payload";

/**
 * Activation licence par scan QR (app mobile).
 * Body: { qr_data, device_id, name, phone, email?, city?, occupation? }
 */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const body = await req.json().catch(() => ({}));

  let cardId = body?.card_id as string | undefined;
  let token = body?.token as string | undefined;
  // On n'utilise plus device_id pour le mobile (on passe par un token).
  // On garde un fallback interne pour conserver la compatibilité des données user/progress existantes.
  const fallbackDeviceId = body?.device_id as string | undefined;

  if (body?.qr_data) {
    const parsed = parseLicenseQrPayload(String(body.qr_data));
    if (!parsed) {
      return NextResponse.json({ error: true, message: "QR code non reconnu" }, { status: 400 });
    }
    cardId = parsed.id;
    token = parsed.token;
  }

  if (!cardId || !token) {
    return NextResponse.json(
      { error: true, message: "qr_data (ou card_id + token) et profil requis" },
      { status: 400 }
    );
  }

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

  const deviceIdForData = fallbackDeviceId?.trim() || `card-${cardId}`;
  const result = await activateLicenseCard(cardId, token, deviceIdForData);

  if (!result.success) {
    return NextResponse.json({ error: true, message: result.message }, { status: 403 });
  }

  const user = await registerStudentProfile(deviceIdForData, result.card.id, profileCheck.data);
  const mobileSession = await createMobileAuthSession(result.card.id);

  return NextResponse.json({
    error: false,
    message: "Licence activée avec succès",
    data: {
      duration_months: result.card.duration_months,
      expires_at: result.card.expires_at,
      activated_at: result.card.activated_at,
      user_id: user.id,
      mobile_token: mobileSession.mobile_token,
      profile: profileCheck.data,
    },
  });
};
