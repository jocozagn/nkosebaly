import { NextRequest, NextResponse } from "next/server";
import {
  fulfillCertificatePayment,
  getCertificateById,
} from "@/lib/admin/store";
import { requireMobileDevice } from "@/lib/mobile/require-device";

/** Vérifie le paiement certificat après retour Djomy — app mobile */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  const user = deviceCheck.user;
  if (!user) {
    return NextResponse.json({ error: true, message: "Profil requis" }, { status: 403 });
  }

  const certId = req.nextUrl.searchParams.get("cert_id");
  const transactionId =
    req.nextUrl.searchParams.get("transaction_id") ??
    req.nextUrl.searchParams.get("transactionId") ??
    req.nextUrl.searchParams.get("payment_id");

  if (!certId) {
    return NextResponse.json({ error: true, message: "cert_id requis" }, { status: 400 });
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
