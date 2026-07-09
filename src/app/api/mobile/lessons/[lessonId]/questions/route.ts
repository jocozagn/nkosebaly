import { NextRequest, NextResponse } from "next/server";
import { addLessonQuestion, getLessonForPlayback } from "@/lib/admin/store";
import { requireMobileDevice } from "@/lib/mobile/require-device";

/** Poser une question sur une leçon — app mobile */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  const { lessonId } = await params;
  const body = (await req.json()) as { text?: string; author_name?: string; course_id?: string };
  const courseId = body.course_id?.trim();

  if (!courseId) {
    return NextResponse.json({ error: true, message: "course_id requis" }, { status: 400 });
  }

  const playback = await getLessonForPlayback(courseId, lessonId);
  if (!playback) {
    return NextResponse.json({ error: true, message: "Leçon introuvable" }, { status: 404 });
  }

  const text = body.text?.trim();
  if (!text || text.length < 3) {
    return NextResponse.json({ error: true, message: "Question trop courte" }, { status: 400 });
  }

  const authorName = body.author_name?.trim() || deviceCheck.user?.name || "Étudiant";
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
      admin_reply: null,
      admin_replied_at: null,
    },
  });
};
