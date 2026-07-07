import { NextRequest, NextResponse } from "next/server";
import { getCertificateById, getStudentUserByAuthToken, readAdminData } from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Détail d'un certificat (propriétaire uniquement, délivré) */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const user = await getStudentUserByAuthToken(licenseCheck.authToken);
  if (!user) {
    return NextResponse.json({ error: true, message: "Profil introuvable" }, { status: 404 });
  }

  const { id } = await params;
  const cert = await getCertificateById(id);

  if (!cert || cert.user_id !== user.id) {
    return NextResponse.json({ error: true, message: "Certificat introuvable" }, { status: 404 });
  }

  if (cert.payment_status !== "paid") {
    return NextResponse.json(
      { error: true, message: "Certificat en attente de validation", code: "PENDING" },
      { status: 403 }
    );
  }

  const data = await readAdminData();
  const course = data.courses.find((c) => c.id === cert.course_id);

  return NextResponse.json({
    error: false,
    data: {
      id: cert.id,
      unique_code: cert.unique_code,
      verification_hash: cert.verification_hash,
      student_name: user.name,
      course_title: course?.title ?? "Cours N'ko",
      issued_at: cert.issued_at,
      verify_url: `/verification/cert/${cert.verification_hash}`,
    },
  });
};
