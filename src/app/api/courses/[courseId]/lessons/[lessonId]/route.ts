import { NextRequest, NextResponse } from "next/server";
import { canStudentAccessLesson, getLessonForPlayback, getLessonReactionStats } from "@/lib/admin/store";
import { getVoterIdFromToken } from "@/lib/auth/voter-id";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Métadonnées leçon pour lecture vidéo + engagement */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const authToken = licenseCheck.authToken;

  const { courseId, lessonId } = await params;

  const access = await canStudentAccessLesson(authToken, courseId, lessonId);
  if (!access.allowed) {
    return NextResponse.json({ error: true, message: access.reason ?? "Accès refusé" }, { status: 403 });
  }

  const playback = await getLessonForPlayback(courseId, lessonId);

  if (!playback) {
    return NextResponse.json({ error: true, message: "Leçon ou vidéo introuvable" }, { status: 404 });
  }

  const voterId = getVoterIdFromToken(authToken);
  const reactionStats = await getLessonReactionStats(lessonId, voterId);

  return NextResponse.json({
    error: false,
    data: {
      lesson_id: playback.lesson.id,
      title: playback.lesson.title,
      duration_minutes: playback.lesson.duration_minutes,
      course_title: playback.course.title,
      stream_url: `/api/videos/stream/${playback.lesson.video_id}?lesson=${playback.lesson.id}`,
      attachments: playback.attachments,
      questions: playback.questions,
      reactions: {
        likes: reactionStats.likes,
        dislikes: reactionStats.dislikes,
        user_vote: reactionStats.user_vote,
      },
    },
  });
};
