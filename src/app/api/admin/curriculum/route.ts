import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { getCurriculumBundle } from "@/lib/admin/store";

/** Curriculum complet en une requête (cours, chapitres, leçons, pièces jointes, questions) */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const courseId = req.nextUrl.searchParams.get("course_id");
  if (!courseId) {
    return NextResponse.json({ error: true, message: "course_id requis" }, { status: 400 });
  }

  const bundle = await getCurriculumBundle(courseId);
  if (!bundle) {
    return NextResponse.json({ error: true, message: "Cours introuvable" }, { status: 404 });
  }

  return NextResponse.json({ error: false, data: bundle });
};

export const dynamic = "force-dynamic";
