import { NextRequest, NextResponse } from "next/server";
import { initiateCertificatePayment } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Initie le paiement Djomy pour obtenir un certificat */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const body = (await req.json().catch(() => ({}))) as { course_id?: string };
  if (!body.course_id) {
    return NextResponse.json({ error: true, message: "course_id requis" }, { status: 400 });
  }

  const result = await initiateCertificatePayment(licenseCheck.authToken, body.course_id);

  if ("error" in result) {
    return NextResponse.json({ error: true, message: result.error }, { status: 400 });
  }

  return NextResponse.json({
    error: false,
    message: "Redirection vers le paiement",
    data: result,
  });
};
