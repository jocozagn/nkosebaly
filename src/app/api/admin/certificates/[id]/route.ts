import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { getCertificateById, readAdminData } from "@/lib/admin/store";

/** Détail certificat pour aperçu / impression admin */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const cert = await getCertificateById(id);

  if (!cert) {
    return NextResponse.json({ error: true, message: "Certificat introuvable" }, { status: 404 });
  }

  const data = await readAdminData();
  const user = data.users.find((u) => u.id === cert.user_id);
  const course = data.courses.find((c) => c.id === cert.course_id);

  return NextResponse.json({
    error: false,
    data: {
      id: cert.id,
      unique_code: cert.unique_code,
      verification_hash: cert.verification_hash,
      student_name: user?.name ?? "Élève",
      course_title: course?.title ?? "Cours N'ko",
      issued_at: cert.issued_at,
      payment_status: cert.payment_status,
      verify_url: `/verification/cert/${cert.verification_hash}`,
    },
  });
};
