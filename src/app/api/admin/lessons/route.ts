import { NextRequest, NextResponse } from "next/server";
import { deleteLesson, getLessonsByCourse, saveLesson } from "@/lib/admin/store";

const isAdmin = (req: NextRequest): boolean => Boolean(req.cookies.get("admin_token")?.value);

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  const courseId = req.nextUrl.searchParams.get("course_id");
  if (!courseId) return NextResponse.json({ error: true, message: "course_id requis" }, { status: 400 });
  return NextResponse.json({ error: false, data: await getLessonsByCourse(courseId) });
};

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  const body = await req.json();
  if (!body?.course_id || !body?.chapter_id || !body?.title) {
    return NextResponse.json({ error: true, message: "Champs requis manquants" }, { status: 400 });
  }
  const lessons = await getLessonsByCourse(body.course_id);
  const lesson = await saveLesson({
    id: crypto.randomUUID(),
    course_id: body.course_id,
    chapter_id: body.chapter_id,
    title: body.title,
    video_id: body.video_id ?? undefined,
    video_url: body.video_url ?? "",
    order: lessons.filter((l) => l.chapter_id === body.chapter_id).length + 1,
    duration_minutes: Math.max(1, Number(body.duration_minutes ?? 1)),
  });
  return NextResponse.json({ error: false, data: lesson });
};

export const DELETE = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: true, message: "id requis" }, { status: 400 });
  await deleteLesson(id);
  return NextResponse.json({ error: false, message: "Leçon supprimée" });
};
