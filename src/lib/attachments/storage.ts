import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const ATTACHMENTS_DIR = path.join(process.cwd(), "data", "attachments");

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/x-wav",
]);

const MAX_BYTES = 20 * 1024 * 1024; // 20 Mo

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/webm": ".webm",
};

export interface SavedAttachment {
  file_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
}

export const ensureAttachmentsDir = async (): Promise<void> => {
  await fs.mkdir(ATTACHMENTS_DIR, { recursive: true });
};

export const getAttachmentFilePath = (fileId: string, mimeType: string): string => {
  const safeId = fileId.replace(/[^a-zA-Z0-9-]/g, "");
  const ext = EXT_BY_MIME[mimeType] ?? "";
  return path.join(ATTACHMENTS_DIR, `${safeId}${ext}`);
};

export const attachmentExists = async (fileId: string, mimeType: string): Promise<boolean> => {
  try {
    await fs.access(getAttachmentFilePath(fileId, mimeType));
    return true;
  } catch {
    return false;
  }
};

export const saveAttachmentFile = async (file: File): Promise<SavedAttachment> => {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Format non supporté (PDF, images, Word, PowerPoint, TXT).");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Fichier trop volumineux (max 20 Mo).");
  }

  await ensureAttachmentsDir();
  const file_id = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(getAttachmentFilePath(file_id, file.type), buffer);

  return {
    file_id,
    original_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  };
};

export const deleteAttachmentFile = async (fileId: string, mimeType: string): Promise<void> => {
  try {
    await fs.unlink(getAttachmentFilePath(fileId, mimeType));
  } catch {
    // déjà supprimé
  }
};
