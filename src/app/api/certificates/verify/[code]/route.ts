import { NextRequest, NextResponse } from "next/server";
import { readAdminData } from "@/lib/admin/store";

/** Vérification publique d'un certificat */
export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> => {
  const { code } = await params;
  const data = await readAdminData();
  const cert = data.certificates.find((c) => c.unique_code === code || c.verification_hash === code);

  if (!cert || cert.payment_status !== "paid") {
    return NextResponse.json({ error: true, message: "Certificat invalide" }, { status: 404 });
  }

  const user = data.users.find((u) => u.id === cert.user_id);
  const course = data.courses.find((c) => c.id === cert.course_id);

  return NextResponse.json({
    error: false,
    data: {
      unique_code: cert.unique_code,
      student_name: user?.name ?? "Étudiant",
      course_title: course?.title ?? "Cours N'ko",
      issued_at: cert.issued_at,
      valid: true,
    },
  });
};
