import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { getLessonAttachmentById } from "@/lib/admin/store";
import { attachmentExists, getAttachmentFilePath } from "@/lib/attachments/storage";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Téléchargement pièce jointe (élève avec licence active) */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const { attachmentId } = await params;
  const attachment = await getLessonAttachmentById(attachmentId);
  if (!attachment) {
    return NextResponse.json({ error: true, message: "Fichier introuvable" }, { status: 404 });
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
