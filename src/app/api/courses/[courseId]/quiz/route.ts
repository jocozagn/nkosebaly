import { NextRequest, NextResponse } from "next/server";
import { getStudentQuizQuestions, getStudentQuizState } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** État du quiz et questions (sans bonnes réponses) */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const { courseId } = await params;
  const state = await getStudentQuizState(licenseCheck.authToken, courseId);

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
