import { NextRequest, NextResponse } from "next/server";
import { recordLessonOpenByAuthToken, updateLessonProgress } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Enregistre la progression de visionnage d'une leçon */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const { courseId, lessonId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    watch_percent?: number;
    seconds_watched?: number;
    client_timestamp?: string;
    event_type?: "heartbeat" | "lesson_open";
  };
  const watchPercent = Number(body.watch_percent ?? 0);
  const eventType = body.event_type === "lesson_open" ? "lesson_open" : "heartbeat";

  if (eventType === "lesson_open") {
    const ok = await recordLessonOpenByAuthToken(
      licenseCheck.authToken,
      courseId,
      lessonId,
      body.client_timestamp
    );
    if (!ok) {
      return NextResponse.json({ error: true, message: "Impossible d'enregistrer" }, { status: 400 });
    }
    return NextResponse.json({ error: false, data: { recorded: true } });
  }

  if (Number.isNaN(watchPercent) || watchPercent < 0 || watchPercent > 100) {
    return NextResponse.json({ error: true, message: "Pourcentage invalide" }, { status: 400 });
  }

  const result = await updateLessonProgress(
    licenseCheck.authToken,
    courseId,
    lessonId,
    watchPercent,
    {
      seconds_watched: Number(body.seconds_watched ?? 0),
      event_type: "heartbeat",
      source: "web",
      client_timestamp: body.client_timestamp,
    }
  );

  if (!result) {
    return NextResponse.json({ error: true, message: "Impossible d'enregistrer la progression" }, { status: 400 });
  }

  return NextResponse.json({ error: false, data: result });
};
