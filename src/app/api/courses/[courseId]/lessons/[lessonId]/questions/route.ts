import { NextRequest, NextResponse } from "next/server";
import { addLessonQuestion, getLessonForPlayback, getStudentUserByAuthToken } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Poser une question sur une leçon */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const { courseId, lessonId } = await params;
  const playback = await getLessonForPlayback(courseId, lessonId);
  if (!playback) {
    return NextResponse.json({ error: true, message: "Leçon introuvable" }, { status: 404 });
  }

  const body = (await req.json()) as { text?: string; author_name?: string };
  const text = body.text?.trim();
  if (!text || text.length < 3) {
    return NextResponse.json({ error: true, message: "Question trop courte" }, { status: 400 });
  }

  const user = await getStudentUserByAuthToken(licenseCheck.authToken);
  const authorName = body.author_name?.trim() || user?.name || "Étudiant";
  const question = await addLessonQuestion({
    id: crypto.randomUUID(),
    lesson_id: lessonId,
    course_id: courseId,
    author_name: authorName.slice(0, 60),
    text: text.slice(0, 1000),
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    error: false,
    data: {
      id: question.id,
      author_name: question.author_name,
      text: question.text,
      created_at: question.created_at,
    },
  });
};
