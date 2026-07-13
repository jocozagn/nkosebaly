import { NextRequest, NextResponse } from "next/server";
import { initiateLicensePurchaseByDeviceId } from "@/lib/admin/store";
import { validateStudentProfile } from "@/lib/admin/profile";

const DEVICE_HEADER = "x-device-id";

/** Initie le paiement Djomy licence — app mobile (sans carte PVC) */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const deviceId = req.headers.get(DEVICE_HEADER)?.trim();
  if (!deviceId) {
    return NextResponse.json({ error: true, message: "X-Device-Id requis" }, { status: 401 });
  }

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

  const result = await initiateLicensePurchaseByDeviceId(deviceId, profileCheck.data);

  if ("error" in result) {
    return NextResponse.json({ error: true, message: result.error }, { status: 400 });
  }

  return NextResponse.json({
    error: false,
    message: "Redirection vers le paiement",
    data: result,
  });
};
