import { NextRequest, NextResponse } from "next/server";
import { updateLessonProgress } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Enregistre la progression de visionnage d'une leçon */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const { courseId, lessonId } = await params;
  const body = (await req.json().catch(() => ({}))) as { watch_percent?: number };
  const watchPercent = Number(body.watch_percent ?? 0);

  if (Number.isNaN(watchPercent) || watchPercent < 0 || watchPercent > 100) {
    return NextResponse.json({ error: true, message: "Pourcentage invalide" }, { status: 400 });
  }

  const result = await updateLessonProgress(
    licenseCheck.authToken,
    courseId,
    lessonId,
    watchPercent
  );

  if (!result) {
    return NextResponse.json({ error: true, message: "Impossible d'enregistrer la progression" }, { status: 400 });
  }

  return NextResponse.json({ error: false, data: result });
};
