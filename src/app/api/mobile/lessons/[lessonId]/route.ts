import { NextRequest, NextResponse } from "next/server";
import {
  getLessonForPlayback,
  getLessonReactionStats,
  readAdminData,
} from "@/lib/admin/store";
import { getVoterIdFromDeviceId } from "@/lib/auth/voter-id";
import { requireMobileDevice } from "@/lib/mobile/require-device";
import { getRequestBaseUrl } from "@/lib/mobile/request-base-url";
import { isLessonUnlocked } from "@/lib/progress/lesson-access";

/** Métadonnées leçon + streaming + engagement pour l'app mobile */
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

  const webUrl = getRequestBaseUrl(req);
  const voterId = getVoterIdFromDeviceId(deviceCheck.deviceId);
  const reactionStats = await getLessonReactionStats(lessonId, voterId);

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
      attachments: playback.attachments.map((att) => ({
        ...att,
        download_url: `${webUrl}/api/mobile/attachments/${att.id}/download`,
      })),
      questions: playback.questions,
      reactions: {
        likes: reactionStats.likes,
        dislikes: reactionStats.dislikes,
        user_vote: reactionStats.user_vote,
      },
    },
  });
};
