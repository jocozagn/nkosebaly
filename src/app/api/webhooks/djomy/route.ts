import { NextRequest, NextResponse } from "next/server";
import { fulfillCertificatePayment } from "@/lib/admin/store";
import { verifyDjomyWebhookSignature } from "@/lib/djomy/client";

interface WebhookPayload {
  eventType: string;
  data?: {
    transactionId?: string;
    metadata?: Record<string, unknown>;
    merchantPaymentReference?: string;
  };
  metadata?: Record<string, unknown>;
  paymentLinkReference?: string;
}

const extractCertificateId = (payload: WebhookPayload): string | undefined => {
  const fromRoot = payload.metadata?.certificate_id;
  if (typeof fromRoot === "string") return fromRoot;

  const fromData = payload.data?.metadata?.certificate_id;
  if (typeof fromData === "string") return fromData;

  const merchantRef = payload.data?.merchantPaymentReference;
  if (typeof merchantRef === "string" && merchantRef.length > 8) return merchantRef;

  return undefined;
};

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

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: true, message: "Corps invalide" }, { status: 400 });
  }

  if (payload.eventType === "payment.success") {
    const transactionId = payload.data?.transactionId;
    const certificateId = extractCertificateId(payload);

    if (transactionId && certificateId) {
      await fulfillCertificatePayment(certificateId, transactionId);
    }
  }

  return NextResponse.json({ error: false, message: "OK" });
};
