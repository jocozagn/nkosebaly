import { NextRequest, NextResponse } from "next/server";
import { getStudentProgressSummaryByDeviceId } from "@/lib/admin/store";
import { requireMobileDevice } from "@/lib/mobile/require-device";

/** Progression globale et par cours — app mobile */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  if (!deviceCheck.user) {
    return NextResponse.json({ error: true, message: "Profil requis" }, { status: 403 });
  }

  const courseId = req.nextUrl.searchParams.get("course_id") ?? undefined;
  const summary = await getStudentProgressSummaryByDeviceId(deviceCheck.deviceId, courseId);

  if (!summary) {
    return NextResponse.json({ error: true, message: "Profil étudiant introuvable" }, { status: 404 });
  }

  return NextResponse.json({ error: false, data: summary });
};
