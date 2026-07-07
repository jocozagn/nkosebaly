import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { Readable } from "stream";
import { readAdminData } from "@/lib/admin/store";
import { requireMobileDevice } from "@/lib/mobile/require-device";
import { isLessonUnlocked } from "@/lib/progress/lesson-access";
import { getVideoFilePath, videoExists } from "@/lib/videos/storage";

interface RouteParams {
  params: Promise<{ videoId: string }>;
}

/** Streaming vidéo mobile — header X-Device-Id obligatoire */
export const GET = async (req: NextRequest, { params }: RouteParams): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  const { videoId } = await params;
  const lessonId = req.nextUrl.searchParams.get("lesson_id");
  const user = deviceCheck.user;

  if (!lessonId || !user) {
    return NextResponse.json({ error: true, message: "lesson_id et profil requis" }, { status: 400 });
  }

  const data = await readAdminData();
  const lesson = data.lessons.find((l) => l.id === lessonId && l.video_id === videoId);
  if (!lesson) {
    return NextResponse.json({ error: true, message: "Leçon introuvable" }, { status: 404 });
  }

  const course = data.courses.find((c) => c.id === lesson.course_id && c.status === "published");
  if (!course || !isLessonUnlocked(data, user.id, lesson.course_id, lessonId, course.sequential_access)) {
    return NextResponse.json({ error: true, message: "Accès refusé" }, { status: 403 });
  }

  if (!(await videoExists(videoId))) {
    return NextResponse.json({ error: true, message: "Vidéo introuvable" }, { status: 404 });
  }

  const filePath = getVideoFilePath(videoId);
  const { statSync } = await import("fs");
  const stat = statSync(filePath);
  const range = req.headers.get("range");

  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Content-Disposition": "inline",
    "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    const stream = createReadStream(filePath, { start, end });
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": String(chunkSize),
      },
    });
  }

  const stream = createReadStream(filePath);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: { ...headers, "Content-Length": String(stat.size) },
  });
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
