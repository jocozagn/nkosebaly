import { NextRequest, NextResponse } from "next/server";
import {
  fulfillCertificatePayment,
  getCertificateById,
  getStudentUserByAuthToken,
} from "@/lib/admin/store";
import { requireActiveLicense } from "@/lib/license/require-license";

/** Vérifie et confirme un paiement certificat après retour Djomy */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const licenseCheck = await requireActiveLicense(req);
  if (!licenseCheck.ok) return licenseCheck.response;

  const certId = req.nextUrl.searchParams.get("cert_id");
  const transactionId = req.nextUrl.searchParams.get("transaction_id");

  if (!certId) {
    return NextResponse.json({ error: true, message: "cert_id requis" }, { status: 400 });
  }

  const user = await getStudentUserByAuthToken(licenseCheck.authToken);
  if (!user) {
    return NextResponse.json({ error: true, message: "Profil introuvable" }, { status: 404 });
  }

  const cert = await getCertificateById(certId);
  if (!cert || cert.user_id !== user.id) {
    return NextResponse.json({ error: true, message: "Certificat introuvable" }, { status: 404 });
  }

  if (cert.payment_status === "paid") {
    return NextResponse.json({
      error: false,
      message: "Certificat déjà délivré",
      data: { status: "paid", certificate_id: cert.id },
    });
  }

  if (!transactionId) {
    return NextResponse.json({
      error: false,
      message: "Paiement en cours de confirmation",
      data: { status: "pending", certificate_id: cert.id },
    });
  }

  const fulfilled = await fulfillCertificatePayment(certId, transactionId);
  if (!fulfilled) {
    return NextResponse.json({
      error: false,
      message: "Paiement non confirmé",
      data: { status: "pending", certificate_id: cert.id },
    });
  }

  return NextResponse.json({
    error: false,
    message: "Paiement confirmé — certificat délivré",
    data: { status: "paid", certificate_id: fulfilled.id },
  });
};
