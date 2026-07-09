import { NextRequest, NextResponse } from "next/server";
import {
  canStudentAccessLesson,
  getBestLessonQuizAttempt,
  getStudentLessonQuizForPlayback,
  getStudentUserByAuthToken,
  readAdminData,
} from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Exercices quiz d'une leçon (sans réponses) */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const { courseId, lessonId } = await params;
  const access = await canStudentAccessLesson(licenseCheck.authToken, courseId, lessonId);
  if (!access.allowed) {
    return NextResponse.json({ error: true, message: access.reason ?? "Accès refusé" }, { status: 403 });
  }

  const items = await getStudentLessonQuizForPlayback(courseId, lessonId, (file) =>
    `/api/quiz-media/${file.file_id}?mime=${encodeURIComponent(file.mime_type)}`
  );

  const user = await getStudentUserByAuthToken(licenseCheck.authToken);
  const data = await readAdminData();
  const bestAttempt = user ? getBestLessonQuizAttempt(data, user.id, lessonId) : undefined;

  return NextResponse.json({
    error: false,
    data: {
      items,
      count: items.length,
      previous_attempt: bestAttempt
        ? {
            score: bestAttempt.score,
            total: bestAttempt.total,
            passed: bestAttempt.passed,
            pass_required: bestAttempt.pass_required,
            created_at: bestAttempt.created_at,
          }
        : null,
    },
  });
};

export const dynamic = "force-dynamic";
