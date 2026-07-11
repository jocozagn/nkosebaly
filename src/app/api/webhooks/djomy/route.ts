import { NextRequest, NextResponse } from "next/server";
import { fulfillCertificatePayment, fulfillLicensePayment } from "@/lib/admin/store";
import { verifyDjomyWebhookSignature } from "@/lib/djomy/client";
import {
  extractCertificateIdFromWebhook,
  extractLicenseOrderIdFromWebhook,
  type DjomyWebhookPayload,
} from "@/lib/djomy/webhook";

/** Webhook Djomy — confirmation automatique certificats et licences */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature");

  if (!signature) {
    return NextResponse.json({ error: true, message: "Signature manquante" }, { status: 400 });
  }

  const isValid = await verifyDjomyWebhookSignature(rawBody, signature);
  if (!isValid) {
    return NextResponse.json({ error: true, message: "Signature invalide" }, { status: 401 });
  }

  let payload: DjomyWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as DjomyWebhookPayload;
  } catch {
    return NextResponse.json({ error: true, message: "Corps invalide" }, { status: 400 });
  }

  if (payload.eventType === "payment.success") {
    const transactionId = payload.data?.transactionId;
    const licenseOrderId = extractLicenseOrderIdFromWebhook(payload);
    const certificateId = extractCertificateIdFromWebhook(payload);

    if (transactionId && licenseOrderId) {
      await fulfillLicensePayment(licenseOrderId, transactionId);
    } else if (transactionId && certificateId) {
      await fulfillCertificatePayment(certificateId, transactionId);
    }
  }

  return NextResponse.json({ error: false, message: "OK" });
};
