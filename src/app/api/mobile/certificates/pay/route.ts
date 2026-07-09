import { NextRequest, NextResponse } from "next/server";
import { initiateCertificatePaymentByDeviceId } from "@/lib/admin/store";
import { requireMobileDevice } from "@/lib/mobile/require-device";

/** Initie le paiement Djomy certificat — app mobile */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  if (!deviceCheck.user) {
    return NextResponse.json({ error: true, message: "Profil requis" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { course_id?: string };
  if (!body.course_id) {
    return NextResponse.json({ error: true, message: "course_id requis" }, { status: 400 });
  }

  const result = await initiateCertificatePaymentByDeviceId(deviceCheck.deviceId, body.course_id);

  if ("error" in result) {
    return NextResponse.json({ error: true, message: result.error }, { status: 400 });
  }

  return NextResponse.json({
    error: false,
    message: "Redirection vers le paiement",
    data: result,
  });
};
