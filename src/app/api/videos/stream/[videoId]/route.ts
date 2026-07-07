import { createReadStream } from "fs";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { readAdminData, canStudentAccessLesson } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";
import { getVideoFilePath, videoExists } from "@/lib/videos/storage";

interface RouteParams {
  params: Promise<{ videoId: string }>;
}

/** Vérifie que la vidéo appartient à un cours publié */
const canAccessVideo = async (videoId: string, lessonId?: string | null): Promise<boolean> => {
  const data = await readAdminData();
  const lesson = data.lessons.find((l) => l.video_id === videoId);
  if (!lesson) return false;
  if (lessonId && lesson.id !== lessonId) return false;
  const course = data.courses.find((c) => c.id === lesson.course_id && c.status === "published");
  return Boolean(course);
};

/** Streaming vidéo protégé — lecture seule, pas de téléchargement direct */
export const GET = async (req: NextRequest, { params }: RouteParams): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const { videoId } = await params;
  const lessonId = req.nextUrl.searchParams.get("lesson");

  if (!(await videoExists(videoId))) {
    return NextResponse.json({ error: true, message: "Vidéo introuvable" }, { status: 404 });
  }

  if (!(await canAccessVideo(videoId, lessonId))) {
    return NextResponse.json({ error: true, message: "Accès refusé" }, { status: 403 });
  }

  if (lessonId) {
    const data = await readAdminData();
    const lesson = data.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      const access = await canStudentAccessLesson(licenseCheck.authToken, lesson.course_id, lessonId);
      if (!access.allowed) {
        return NextResponse.json({ error: true, message: access.reason ?? "Leçon verrouillée" }, { status: 403 });
      }
    }
  }

  const filePath = getVideoFilePath(videoId);
  const { statSync } = await import("fs");
  const stat = statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.get("range");

  const secureHeaders: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Content-Disposition": "inline",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
  };

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${fileSize}` } });
    }

    const chunkSize = end - start + 1;
    const stream = createReadStream(filePath, { start, end });

    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        ...secureHeaders,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": String(chunkSize),
      },
    });
  }

  const stream = createReadStream(filePath);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      ...secureHeaders,
      "Content-Length": String(fileSize),
    },
  });
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
