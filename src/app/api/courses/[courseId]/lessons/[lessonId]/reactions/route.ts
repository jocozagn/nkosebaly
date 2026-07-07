import { NextRequest, NextResponse } from "next/server";
import { getLessonForPlayback, setLessonReaction } from "@/lib/admin/store";
import { getVoterIdFromToken } from "@/lib/auth/voter-id";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Like ou dislike une leçon */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const authToken = licenseCheck.authToken;
  const { courseId, lessonId } = await params;
  const playback = await getLessonForPlayback(courseId, lessonId);
  if (!playback) {
    return NextResponse.json({ error: true, message: "Leçon introuvable" }, { status: 404 });
  }

  const body = (await req.json()) as { vote?: string };
  if (body.vote !== "like" && body.vote !== "dislike") {
    return NextResponse.json({ error: true, message: "Vote invalide" }, { status: 400 });
  }

  const voterId = getVoterIdFromToken(authToken);
  const result = await setLessonReaction(lessonId, voterId, body.vote);

  return NextResponse.json({ error: false, data: result });
};
