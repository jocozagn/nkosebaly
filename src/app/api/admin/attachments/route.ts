import { NextRequest, NextResponse } from "next/server";
import {
  deleteLessonAttachment,
  getLessonAttachments,
  saveLessonAttachment,
} from "@/lib/admin/store";
import { saveAttachmentFile } from "@/lib/attachments/storage";

const isAdmin = (req: NextRequest): boolean => Boolean(req.cookies.get("admin_token")?.value);

/** Liste ou upload de pièces jointes (admin) */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const lessonId = req.nextUrl.searchParams.get("lesson_id");
  if (!lessonId) {
    return NextResponse.json({ error: true, message: "lesson_id requis" }, { status: 400 });
  }

  const attachments = await getLessonAttachments(lessonId);
  return NextResponse.json({ error: false, data: attachments });
};

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const lessonId = formData.get("lesson_id")?.toString();
  const courseId = formData.get("course_id")?.toString();

  if (!lessonId || !courseId) {
    return NextResponse.json({ error: true, message: "lesson_id et course_id requis" }, { status: 400 });
  }
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: true, message: "Fichier requis" }, { status: 400 });
  }

  try {
    const saved = await saveAttachmentFile(file);
    const attachment = await saveLessonAttachment({
      id: crypto.randomUUID(),
      lesson_id: lessonId,
      course_id: courseId,
      file_id: saved.file_id,
      original_name: saved.original_name,
      mime_type: saved.mime_type,
      size_bytes: saved.size_bytes,
      created_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: false, data: attachment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Échec de l'upload";
    return NextResponse.json({ error: true, message }, { status: 400 });
  }
};

export const DELETE = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: true, message: "id requis" }, { status: 400 });
  }

  await deleteLessonAttachment(id);
  return NextResponse.json({ error: false });
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
