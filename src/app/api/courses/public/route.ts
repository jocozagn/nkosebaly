import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getCourses, getPublicCourseDetails } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Cours publiés — accès réservé aux élèves avec licence active */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(request);
  if (!licenseCheck.ok) return licenseCheck.response;

  const url = new URL(request.url);
  const courseId = url.searchParams.get("id");

  if (courseId) {
    const details = await getPublicCourseDetails(courseId);
    if (!details) return NextResponse.json({ error: true, message: "Cours introuvable" }, { status: 404 });
    return NextResponse.json({ error: false, data: details });
  }

  const courses = (await getCourses()).filter((c) => c.status === "published");
  return NextResponse.json({ error: false, data: courses });
};
