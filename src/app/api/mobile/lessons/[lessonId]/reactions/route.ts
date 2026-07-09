import { NextRequest, NextResponse } from "next/server";
import { getLessonForPlayback, setLessonReaction } from "@/lib/admin/store";
import { getVoterIdFromDeviceId } from "@/lib/auth/voter-id";
import { requireMobileDevice } from "@/lib/mobile/require-device";

/** Like ou dislike une leçon — app mobile */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  const { lessonId } = await params;
  const body = (await req.json()) as { vote?: string; course_id?: string };
  const courseId = body.course_id?.trim();

  if (!courseId) {
    return NextResponse.json({ error: true, message: "course_id requis" }, { status: 400 });
  }

  const playback = await getLessonForPlayback(courseId, lessonId);
  if (!playback) {
    return NextResponse.json({ error: true, message: "Leçon introuvable" }, { status: 404 });
  }

  if (body.vote !== "like" && body.vote !== "dislike") {
    return NextResponse.json({ error: true, message: "Vote invalide" }, { status: 400 });
  }

  const voterId = getVoterIdFromDeviceId(deviceCheck.deviceId);
  const result = await setLessonReaction(lessonId, voterId, body.vote);

  return NextResponse.json({ error: false, data: result });
};
