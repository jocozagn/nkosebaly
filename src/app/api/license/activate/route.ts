import { NextRequest, NextResponse } from "next/server";
import { activateLicenseCard, registerStudentProfile } from "@/lib/admin/store";
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
  const deviceId = body?.device_id as string | undefined;

  if (body?.qr_data) {
    const parsed = parseLicenseQrPayload(String(body.qr_data));
    if (!parsed) {
      return NextResponse.json({ error: true, message: "QR code non reconnu" }, { status: 400 });
    }
    cardId = parsed.id;
    token = parsed.token;
  }

  if (!cardId || !token || !deviceId) {
    return NextResponse.json(
      { error: true, message: "qr_data (ou card_id + token), device_id et profil requis" },
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

  const result = await activateLicenseCard(cardId, token, deviceId);

  if (!result.success) {
    return NextResponse.json({ error: true, message: result.message }, { status: 403 });
  }

  const user = await registerStudentProfile(deviceId, result.card.id, profileCheck.data);

  return NextResponse.json({
    error: false,
    message: "Licence activée avec succès",
    data: {
      duration_months: result.card.duration_months,
      expires_at: result.card.expires_at,
      activated_at: result.card.activated_at,
      user_id: user.id,
      profile: profileCheck.data,
    },
  });
};
