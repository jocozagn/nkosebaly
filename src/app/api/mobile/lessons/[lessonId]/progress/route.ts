import { NextRequest, NextResponse } from "next/server";
import { recordLessonOpenByDeviceId, updateLessonProgressByDeviceId } from "@/lib/admin/store";
import { requireMobileDevice } from "@/lib/mobile/require-device";

/** Enregistre la progression de visionnage — app mobile */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  if (!deviceCheck.user) {
    return NextResponse.json({ error: true, message: "Profil requis" }, { status: 403 });
  }

  const { lessonId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    course_id?: string;
    watch_percent?: number;
    seconds_watched?: number;
    client_timestamp?: string;
    event_type?: "heartbeat" | "lesson_open";
    offline?: boolean;
  };

  const courseId = body.course_id?.trim();
  const watchPercent = Number(body.watch_percent ?? 0);
  const eventType = body.event_type === "lesson_open" ? "lesson_open" : "heartbeat";

  if (!courseId) {
    return NextResponse.json({ error: true, message: "course_id requis" }, { status: 400 });
  }

  // Ouverture de leçon sans pourcentage
  if (eventType === "lesson_open") {
    const ok = await recordLessonOpenByDeviceId(
      deviceCheck.deviceId,
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

  const result = await updateLessonProgressByDeviceId(
    deviceCheck.deviceId,
    courseId,
    lessonId,
    watchPercent,
    {
      seconds_watched: Number(body.seconds_watched ?? 0),
      event_type: "heartbeat",
      source: "mobile",
      client_timestamp: body.client_timestamp,
      offline: body.offline === true,
    }
  );

  if (!result) {
    return NextResponse.json(
      { error: true, message: "Impossible d'enregistrer la progression" },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: false, data: result });
};
