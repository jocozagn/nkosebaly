import { NextRequest, NextResponse } from "next/server";
import { submitStudentQuiz } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Soumet les réponses du quiz et retourne le résultat */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const { courseId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    answers?: { question_id: string; selected: number }[];
  };

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: true, message: "Réponses requises" }, { status: 400 });
  }

  const result = await submitStudentQuiz(licenseCheck.authToken, courseId, body.answers);

  if ("error" in result) {
    return NextResponse.json({ error: true, message: result.error }, { status: 400 });
  }

  return NextResponse.json({ error: false, data: result });
};
