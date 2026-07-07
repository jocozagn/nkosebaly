import { NextRequest, NextResponse } from "next/server";
import { approveCertificate, getCertificates, issueCertificate } from "@/lib/admin/store";

const isAdmin = (req: NextRequest): boolean => Boolean(req.cookies.get("admin_token")?.value);

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  return NextResponse.json({ error: false, data: await getCertificates() });
};

/** Émettre un certificat (admin) — force=true ignore l'éligibilité */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  const body = await req.json();
  if (!body?.user_id || !body?.course_id) {
    return NextResponse.json({ error: true, message: "user_id et course_id requis" }, { status: 400 });
  }

  const result = await issueCertificate(body.user_id, body.course_id, Boolean(body.force));
  if ("error" in result) {
    return NextResponse.json({ error: true, message: result.error }, { status: 400 });
  }

  return NextResponse.json({ error: false, data: result });
};

/** Approuver une demande en attente */
export const PATCH = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: true, message: "id requis" }, { status: 400 });

  const cert = await approveCertificate(id);
  if (!cert) {
    return NextResponse.json({ error: true, message: "Demande introuvable ou déjà traitée" }, { status: 404 });
  }

  return NextResponse.json({ error: false, data: cert, message: "Certificat approuvé" });
};
