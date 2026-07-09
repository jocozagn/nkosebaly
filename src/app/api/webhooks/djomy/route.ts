import { NextRequest, NextResponse } from "next/server";
import { fulfillCertificatePayment } from "@/lib/admin/store";
import { verifyDjomyWebhookSignature } from "@/lib/djomy/client";
import {
  extractCertificateIdFromWebhook,
  type DjomyWebhookPayload,
} from "@/lib/djomy/webhook";

/** Webhook Djomy — confirmation automatique des paiements certificat */
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
    const certificateId = extractCertificateIdFromWebhook(payload);

    if (transactionId && certificateId) {
      await fulfillCertificatePayment(certificateId, transactionId);
    }
  }

  return NextResponse.json({ error: false, message: "OK" });
};
