import { NextRequest, NextResponse } from "next/server";
import { getLessonForPlayback, readAdminData } from "@/lib/admin/store";
import { requireMobileDevice } from "@/lib/mobile/require-device";
import { isLessonUnlocked } from "@/lib/progress/lesson-access";

/** Métadonnées leçon + URL streaming pour l'app mobile */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  const { lessonId } = await params;
  const courseId = req.nextUrl.searchParams.get("course_id");

  if (!courseId) {
    return NextResponse.json({ error: true, message: "course_id requis" }, { status: 400 });
  }

  const user = deviceCheck.user;
  if (!user) {
    return NextResponse.json({ error: true, message: "Profil requis" }, { status: 403 });
  }

  const data = await readAdminData();
  const course = data.courses.find((c) => c.id === courseId);
  if (!isLessonUnlocked(data, user.id, courseId, lessonId, course?.sequential_access)) {
    return NextResponse.json({ error: true, message: "Leçon verrouillée" }, { status: 403 });
  }

  const playback = await getLessonForPlayback(courseId, lessonId);
  if (!playback) {
    return NextResponse.json({ error: true, message: "Leçon introuvable" }, { status: 404 });
  }

  const webUrl = (process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3001").replace(/\/$/, "");

  return NextResponse.json({
    error: false,
    data: {
      lesson_id: playback.lesson.id,
      title: playback.lesson.title,
      course_title: playback.course.title,
      video_id: playback.lesson.video_id,
      duration_minutes: playback.lesson.duration_minutes,
      stream_url: `${webUrl}/api/mobile/videos/${playback.lesson.video_id}/stream?lesson_id=${lessonId}`,
      download_url: `${webUrl}/api/mobile/videos/${playback.lesson.video_id}/download?lesson_id=${lessonId}`,
    },
  });
};
