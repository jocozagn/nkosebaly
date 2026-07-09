import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getCourses, getPublicCourseDetails, getStudentLicenseByAuthToken, getAllowedCourseIdsForCard } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Cours publiés — accès réservé aux élèves avec licence active */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(request);
  if (!licenseCheck.ok) return licenseCheck.response;

  const license = await getStudentLicenseByAuthToken(licenseCheck.authToken);
  const allowed = license ? getAllowedCourseIdsForCard(license.card) : null;

  const url = new URL(request.url);
  const courseId = url.searchParams.get("id");

  if (courseId) {
    if (allowed && !allowed.includes(courseId)) {
      return NextResponse.json({ error: true, message: "Accès refusé" }, { status: 403 });
    }
    const details = await getPublicCourseDetails(courseId);
    if (!details) return NextResponse.json({ error: true, message: "Cours introuvable" }, { status: 404 });
    return NextResponse.json({ error: false, data: details });
  }

  const courses = (await getCourses()).filter((c) => c.status === "published");
  const filtered = allowed ? courses.filter((c) => allowed.includes(c.id)) : courses;
  return NextResponse.json({ error: false, data: filtered });
};
