import { NextRequest, NextResponse } from "next/server";
import { requestCertificateByAuth } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Demander un certificat après cours + quiz validés */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const body = (await req.json().catch(() => ({}))) as { course_id?: string };
  if (!body.course_id) {
    return NextResponse.json({ error: true, message: "course_id requis" }, { status: 400 });
  }

  const result = await requestCertificateByAuth(licenseCheck.authToken, body.course_id);

  if ("error" in result) {
    return NextResponse.json({ error: true, message: result.error }, { status: 400 });
  }

  return NextResponse.json({
    error: false,
    message: "Demande envoyée. L'administrateur validera votre certificat.",
    data: result,
  });
};
