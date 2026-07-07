import { NextRequest, NextResponse } from "next/server";
import { deleteQuizQuestion, getQuizQuestions, saveQuizQuestion } from "@/lib/admin/store";
import type { QuizCategory, QuizDifficulty } from "@/lib/admin/types";

const isAdmin = (req: NextRequest): boolean => Boolean(req.cookies.get("admin_token")?.value);

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  const courseId = req.nextUrl.searchParams.get("course_id") ?? undefined;
  return NextResponse.json({ error: false, data: await getQuizQuestions(courseId) });
};

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  const body = await req.json();
  if (!body?.course_id || !body?.question_text || !body?.options?.length) {
    return NextResponse.json({ error: true, message: "Champs requis manquants" }, { status: 400 });
  }
  const q = await saveQuizQuestion({
    id: crypto.randomUUID(),
    course_id: body.course_id,
    question_text: body.question_text,
    options: body.options,
    correct_answer: Number(body.correct_answer ?? 0),
    category: (body.category as QuizCategory) ?? "grammaire",
    difficulty: (body.difficulty as QuizDifficulty) ?? "facile",
    active: body.active !== false,
    created_at: new Date().toISOString(),
  });
  return NextResponse.json({ error: false, data: q });
};

export const DELETE = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: true, message: "id requis" }, { status: 400 });
  await deleteQuizQuestion(id);
  return NextResponse.json({ error: false, message: "Question supprimée" });
};
