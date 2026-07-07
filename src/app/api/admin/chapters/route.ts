import { NextRequest, NextResponse } from "next/server";
import { deleteChapter, getChaptersByCourse, saveChapter } from "@/lib/admin/store";

const isAdmin = (req: NextRequest): boolean => Boolean(req.cookies.get("admin_token")?.value);

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  const courseId = req.nextUrl.searchParams.get("course_id");
  if (!courseId) return NextResponse.json({ error: true, message: "course_id requis" }, { status: 400 });
  const chapters = await getChaptersByCourse(courseId);
  return NextResponse.json({ error: false, data: chapters });
};

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  const body = await req.json();
  if (!body?.course_id || !body?.title) {
    return NextResponse.json({ error: true, message: "course_id et title requis" }, { status: 400 });
  }
  const chapters = await getChaptersByCourse(body.course_id);
  const chapter = await saveChapter({
    id: crypto.randomUUID(),
    course_id: body.course_id,
    title: body.title,
    order: chapters.length + 1,
  });
  return NextResponse.json({ error: false, data: chapter });
};

export const DELETE = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: true, message: "id requis" }, { status: 400 });
  await deleteChapter(id);
  return NextResponse.json({ error: false, message: "Chapitre supprimé" });
};
