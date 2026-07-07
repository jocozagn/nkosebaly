import { NextRequest, NextResponse } from "next/server";
import {
  getLessonQuestions,
  getLessonQuestionsByCourse,
  replyToLessonQuestion,
} from "@/lib/admin/store";

const isAdmin = (req: NextRequest): boolean => Boolean(req.cookies.get("admin_token")?.value);

/** Liste ou réponse aux questions des élèves (admin) */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const lessonId = req.nextUrl.searchParams.get("lesson_id");
  const courseId = req.nextUrl.searchParams.get("course_id");

  if (lessonId) {
    return NextResponse.json({ error: false, data: await getLessonQuestions(lessonId) });
  }
  if (courseId) {
    return NextResponse.json({ error: false, data: await getLessonQuestionsByCourse(courseId) });
  }

  return NextResponse.json({ error: true, message: "lesson_id ou course_id requis" }, { status: 400 });
};

export const PATCH = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const body = (await req.json()) as { id?: string; reply?: string };
  const reply = body.reply?.trim();

  if (!body.id || !reply || reply.length < 2) {
    return NextResponse.json({ error: true, message: "Réponse trop courte" }, { status: 400 });
  }

  const question = await replyToLessonQuestion(body.id, reply.slice(0, 2000));
  if (!question) {
    return NextResponse.json({ error: true, message: "Question introuvable" }, { status: 404 });
  }

  return NextResponse.json({ error: false, data: question });
};
