import { NextRequest, NextResponse } from "next/server";
import { submitStudentLessonQuiz } from "@/lib/admin/store";
import type { StudentLessonQuizAnswerPayload } from "@/lib/admin/types";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Soumet les réponses du quiz de leçon */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const { courseId, lessonId } = await params;
  const body = await req.json().catch(() => null);
  const answers = (body?.answers as StudentLessonQuizAnswerPayload[] | undefined) ?? [];

  const result = await submitStudentLessonQuiz(licenseCheck.authToken, courseId, lessonId, answers);
  if ("error" in result) {
    return NextResponse.json({ error: true, message: result.error }, { status: 400 });
  }

  return NextResponse.json({ error: false, data: result });
};

export const dynamic = "force-dynamic";
