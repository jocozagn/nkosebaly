import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { saveAttachmentFile } from "@/lib/attachments/storage";

/** Upload audio ou image pour un quiz de leçon */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: true, message: "Fichier requis" }, { status: 400 });
  }

  const isAudio = file.type.startsWith("audio/");
  const isImage = file.type.startsWith("image/");
  if (!isAudio && !isImage) {
    return NextResponse.json({ error: true, message: "Audio ou image uniquement" }, { status: 400 });
  }

  try {
    const saved = await saveAttachmentFile(file);
    return NextResponse.json({
      error: false,
      data: {
        file_id: saved.file_id,
        mime_type: saved.mime_type,
        original_name: saved.original_name,
        preview_url: `/api/quiz-media/${saved.file_id}?mime=${encodeURIComponent(saved.mime_type)}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Échec de l'upload";
    return NextResponse.json({ error: true, message }, { status: 400 });
  }
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
