import { NextRequest, NextResponse } from "next/server";
import { getCourses, getPublicCourseDetails, getAllowedCourseIdsForCard } from "@/lib/admin/store";
import { requireMobileDevice } from "@/lib/mobile/require-device";

/** Cours publiés pour l'app mobile */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  const courseId = req.nextUrl.searchParams.get("id");
  const allowed = getAllowedCourseIdsForCard(deviceCheck.card);

  if (courseId) {
    if (allowed && !allowed.includes(courseId)) {
      return NextResponse.json({ error: true, message: "Accès refusé" }, { status: 403 });
    }
    const details = await getPublicCourseDetails(courseId);
    if (!details) {
      return NextResponse.json({ error: true, message: "Cours introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: false, data: details });
  }

  const courses = (await getCourses()).filter((c) => c.status === "published");
  const filtered = allowed ? courses.filter((c) => allowed.includes(c.id)) : courses;
  return NextResponse.json({ error: false, data: filtered });
};
