import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { getLessonAttachmentById, readAdminData } from "@/lib/admin/store";
import { attachmentExists, getAttachmentFilePath } from "@/lib/attachments/storage";
import { requireMobileDevice } from "@/lib/mobile/require-device";
import { isLessonUnlocked } from "@/lib/progress/lesson-access";

/** Téléchargement pièce jointe — app mobile (X-Device-Id) */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  const user = deviceCheck.user;
  if (!user) {
    return NextResponse.json({ error: true, message: "Profil requis" }, { status: 403 });
  }

  const { attachmentId } = await params;
  const attachment = await getLessonAttachmentById(attachmentId);
  if (!attachment) {
    return NextResponse.json({ error: true, message: "Fichier introuvable" }, { status: 404 });
  }

  const data = await readAdminData();
  const lesson = data.lessons.find((l) => l.id === attachment.lesson_id);
  const course = lesson ? data.courses.find((c) => c.id === lesson.course_id) : undefined;

  if (!lesson || !course || course.status !== "published") {
    return NextResponse.json({ error: true, message: "Accès refusé" }, { status: 403 });
  }

  if (!isLessonUnlocked(data, user.id, lesson.course_id, lesson.id, course.sequential_access)) {
    return NextResponse.json({ error: true, message: "Leçon verrouillée" }, { status: 403 });
  }

  const exists = await attachmentExists(attachment.file_id, attachment.mime_type);
  if (!exists) {
    return NextResponse.json({ error: true, message: "Fichier manquant sur le serveur" }, { status: 404 });
  }

  const filePath = getAttachmentFilePath(attachment.file_id, attachment.mime_type);
  const buffer = await fs.readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": attachment.mime_type,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.original_name)}"`,
      "Content-Length": String(buffer.length),
    },
  });
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
