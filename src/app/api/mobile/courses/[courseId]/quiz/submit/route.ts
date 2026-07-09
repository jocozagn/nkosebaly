import { NextRequest, NextResponse } from "next/server";
import { submitStudentQuizByDeviceId } from "@/lib/admin/store";
import { requireMobileDevice } from "@/lib/mobile/require-device";

/**
 * Mobile: soumet les réponses du quiz et retourne le résultat.
 * Auth: X-Mobile-Token (ou X-Device-Id en fallback).
 */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  const { courseId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    answers?: { question_id: string; selected: number }[];
  };

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: true, message: "Réponses requises" }, { status: 400 });
  }

  const result = await submitStudentQuizByDeviceId(deviceCheck.deviceId, courseId, body.answers);

  if ("error" in result) {
    return NextResponse.json({ error: true, message: result.error }, { status: 400 });
  }

  return NextResponse.json({ error: false, data: result });
};

