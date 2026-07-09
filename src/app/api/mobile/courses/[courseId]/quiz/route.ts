import { NextRequest, NextResponse } from "next/server";
import { getStudentQuizQuestions, getStudentQuizStateByDeviceId } from "@/lib/admin/store";
import { requireMobileDevice } from "@/lib/mobile/require-device";

/**
 * Mobile: état du quiz + questions (sans bonnes réponses).
 * Auth: X-Mobile-Token (ou X-Device-Id en fallback).
 */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  const { courseId } = await params;
  const state = await getStudentQuizStateByDeviceId(deviceCheck.deviceId, courseId);

  if (!state) {
    return NextResponse.json({ error: true, message: "Cours introuvable" }, { status: 404 });
  }

  const questions = state.can_attempt ? await getStudentQuizQuestions(courseId) : [];

  return NextResponse.json({
    error: false,
    data: {
      ...state,
      questions,
    },
  });
};

