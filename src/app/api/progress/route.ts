import { NextRequest, NextResponse } from "next/server";
import { getStudentProgressSummary } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Progression globale et par cours de l'élève connecté */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const courseId = req.nextUrl.searchParams.get("course_id") ?? undefined;
  const summary = await getStudentProgressSummary(licenseCheck.authToken, courseId);

  if (!summary) {
    return NextResponse.json({ error: true, message: "Profil étudiant introuvable" }, { status: 404 });
  }

  return NextResponse.json({ error: false, data: summary });
};
