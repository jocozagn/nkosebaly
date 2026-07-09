import { NextRequest, NextResponse } from "next/server";
import {
  getBestLessonQuizAttempt,
  getStudentLessonQuizForPlayback,
  submitStudentLessonQuizByUserId,
  readAdminData,
} from "@/lib/admin/store";
import type { StudentLessonQuizAnswerPayload } from "@/lib/admin/types";
import { requireMobileDevice } from "@/lib/mobile/require-device";
import { getRequestBaseUrl } from "@/lib/mobile/request-base-url";

/** Mobile : exercices quiz d'une leçon */
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

  const webUrl = getRequestBaseUrl(req);
  const mobileToken = req.headers.get("x-mobile-token")?.trim();
  const tokenQuery = mobileToken ? `&mobile_token=${encodeURIComponent(mobileToken)}` : "";

  const items = await getStudentLessonQuizForPlayback(courseId, lessonId, (file) =>
    `${webUrl}/api/quiz-media/${file.file_id}?mime=${encodeURIComponent(file.mime_type)}${tokenQuery}`
  );

  const data = await readAdminData();
  const bestAttempt = deviceCheck.user
    ? getBestLessonQuizAttempt(data, deviceCheck.user.id, lessonId)
    : undefined;

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

/** Mobile : soumission quiz de leçon */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  const user = deviceCheck.user;
  if (!user) {
    return NextResponse.json({ error: true, message: "Profil requis" }, { status: 403 });
  }

  const { lessonId } = await params;
  const body = await req.json().catch(() => null);
  const courseId = body?.course_id?.toString();
  if (!courseId) {
    return NextResponse.json({ error: true, message: "course_id requis" }, { status: 400 });
  }

  const answers = (body?.answers as StudentLessonQuizAnswerPayload[] | undefined) ?? [];
  const result = await submitStudentLessonQuizByUserId(user.id, courseId, lessonId, answers);

  if ("error" in result) {
    return NextResponse.json({ error: true, message: result.error }, { status: 400 });
  }

  return NextResponse.json({ error: false, data: result });
};

export const dynamic = "force-dynamic";
