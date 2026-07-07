import { NextRequest, NextResponse } from "next/server";
import { getStudentCertificatesOverview } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Certificats et éligibilité de l'élève */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const overview = await getStudentCertificatesOverview(licenseCheck.authToken);
  if (!overview) {
    return NextResponse.json({ error: true, message: "Profil introuvable" }, { status: 404 });
  }

  return NextResponse.json({ error: false, data: overview });
};
