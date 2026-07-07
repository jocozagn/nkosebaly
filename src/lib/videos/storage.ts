import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

/** Dossier privé — jamais exposé dans /public */
export const VIDEOS_DIR = path.join(process.cwd(), "data", "videos");

const ALLOWED_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_BYTES = Number(process.env.MAX_VIDEO_SIZE_MB ?? 500) * 1024 * 1024;

export interface SavedVideo {
  video_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
}

export const ensureVideosDir = async (): Promise<void> => {
  await fs.mkdir(VIDEOS_DIR, { recursive: true });
};

export const getVideoFilePath = (videoId: string): string => {
  const safeId = videoId.replace(/[^a-zA-Z0-9-]/g, "");
  return path.join(VIDEOS_DIR, `${safeId}.mp4`);
};

export const videoExists = async (videoId: string): Promise<boolean> => {
  try {
    await fs.access(getVideoFilePath(videoId));
    return true;
  } catch {
    return false;
  }
};

/** Enregistre un fichier vidéo uploadé (stream → disque) */
export const saveVideoFile = async (file: File): Promise<SavedVideo> => {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Format non supporté. Utilisez MP4, WebM ou MOV.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Fichier trop volumineux (max ${process.env.MAX_VIDEO_SIZE_MB ?? 500} Mo).`);
  }

  await ensureVideosDir();
  const video_id = randomUUID();
  const dest = getVideoFilePath(video_id);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(dest, buffer);

  return {
    video_id,
    filename: file.name,
    mime_type: file.type === "video/quicktime" ? "video/mp4" : file.type,
    size_bytes: file.size,
  };
};

export const deleteVideoFile = async (videoId: string): Promise<void> => {
  try {
    await fs.unlink(getVideoFilePath(videoId));
  } catch {
    // Fichier déjà absent
  }
};

export const getVideoStats = async (videoId: string): Promise<{ size: number }> => {
  const stat = await fs.stat(getVideoFilePath(videoId));
  return { size: stat.size };
};
