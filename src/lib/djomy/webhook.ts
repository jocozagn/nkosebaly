/** Extraction certificate_id depuis payload webhook Djomy */
export interface DjomyWebhookPayload {
  eventType: string;
  data?: {
    transactionId?: string;
    metadata?: Record<string, unknown>;
    merchantPaymentReference?: string;
  };
  metadata?: Record<string, unknown>;
  paymentLinkReference?: string;
}

export const extractCertificateIdFromWebhook = (
  payload: DjomyWebhookPayload
): string | undefined => {
  const fromRoot = payload.metadata?.certificate_id;
  if (typeof fromRoot === "string") return fromRoot;

  const fromData = payload.data?.metadata?.certificate_id;
  if (typeof fromData === "string") return fromData;

  const merchantRef = payload.data?.merchantPaymentReference;
  if (typeof merchantRef === "string" && merchantRef.length > 8) return merchantRef;

  return undefined;
};
