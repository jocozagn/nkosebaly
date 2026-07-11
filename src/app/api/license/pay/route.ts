import { NextRequest, NextResponse } from "next/server";
import { initiateLicensePurchase } from "@/lib/admin/store";
import { validateStudentProfile } from "@/lib/admin/profile";
import { getAuthToken, getDeviceId } from "@/lib/license/require-license";

/** Initie l'achat licence en ligne via Djomy (sans carte PVC) */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const authToken = getAuthToken(req);
  if (!authToken) {
    return NextResponse.json({ error: true, message: "Connexion requise" }, { status: 401 });
  }

  let deviceId = getDeviceId(req);
  if (!deviceId) deviceId = crypto.randomUUID();

  const body = await req.json().catch(() => ({}));
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

  const result = await initiateLicensePurchase(authToken, deviceId, profileCheck.data);

  if ("error" in result) {
    return NextResponse.json({ error: true, message: result.error }, { status: 400 });
  }

  return NextResponse.json({
    error: false,
    message: "Redirection vers le paiement",
    data: { paymentUrl: result.paymentUrl, orderId: result.orderId },
  });
};
