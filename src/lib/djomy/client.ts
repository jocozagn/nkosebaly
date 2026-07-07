import { getDjomyConfig } from "@/lib/djomy/config";

/** Réponse standard de l'API Djomy */
interface DjomyResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error: { code: number; message: string; details: string; fieldsErrors: string[] } | null;
  timestamp: string;
  status: number;
}

export interface CreatePaymentLinkInput {
  countryCode: string;
  amountToPay: number;
  linkName: string;
  description: string;
  merchantReference: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface PaymentLinkData {
  paymentLinkReference: string;
  paymentPageUrl: string;
  merchantReference: string;
}

export interface PaymentStatusData {
  transactionId: string;
  status:
    | "CREATED"
    | "PENDING"
    | "FAILED"
    | "SUCCESS"
    | "REDIRECTED"
    | "CANCELLED"
    | "TIMEOUT"
    | "REFUNDED";
  paidAmount: number;
  receivedAmount: number;
  merchantPaymentReference: string;
}

/** HMAC SHA-256 hex — signature requise pour X-API-KEY */
const computeHmacHex = async (message: string, secret: string): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/** En-têtes communs — X-PARTNER-DOMAIN obligatoire sur toutes les requêtes Djomy */
const buildDjomyHeaders = async (
  options: { accessToken?: string; withApiKey?: boolean } = {}
): Promise<Record<string, string>> => {
  const config = getDjomyConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-PARTNER-DOMAIN": config.partnerDomain,
  };

  if (options.withApiKey) {
    const signature = await computeHmacHex(config.clientId, config.clientSecret);
    headers["X-API-KEY"] = `${config.clientId}:${signature}`;
  }

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  return headers;
};

/** Authentification — POST /v1/auth */
export const getDjomyAccessToken = async (): Promise<string> => {
  const config = getDjomyConfig();
  const headers = await buildDjomyHeaders({ withApiKey: true });

  const response = await fetch(`${config.baseUrl}/v1/auth`, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Djomy auth échouée: ${response.status}`);
  }

  const result = (await response.json()) as DjomyResponse<{ accessToken: string }>;
  if (!result.success) {
    throw new Error(`Djomy auth erreur: ${result.message}`);
  }

  return result.data.accessToken;
};

/** Crée un lien de paiement unique — POST /v1/links */
export const createDjomyPaymentLink = async (
  input: CreatePaymentLinkInput
): Promise<PaymentLinkData> => {
  const config = getDjomyConfig();
  const accessToken = await getDjomyAccessToken();
  const headers = await buildDjomyHeaders({ accessToken, withApiKey: true });

  const response = await fetch(`${config.baseUrl}/v1/links`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      countryCode: input.countryCode,
      amountToPay: input.amountToPay,
      linkName: input.linkName,
      description: input.description,
      usageType: "UNIQUE",
      merchantReference: input.merchantReference,
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
      metadata: input.metadata,
    }),
  });

  const result = (await response.json()) as DjomyResponse<PaymentLinkData>;
  if (!result.success) {
    throw new Error(`Djomy lien paiement: ${result.error?.message ?? result.message}`);
  }

  return result.data;
};

/** Vérifie le statut d'un paiement — GET /v1/payments/{id}/status */
export const verifyDjomyPayment = async (transactionId: string): Promise<PaymentStatusData> => {
  const config = getDjomyConfig();
  const accessToken = await getDjomyAccessToken();
  const headers = await buildDjomyHeaders({ accessToken, withApiKey: true });

  const response = await fetch(`${config.baseUrl}/v1/payments/${transactionId}/status`, {
    method: "GET",
    headers,
  });

  const result = (await response.json()) as DjomyResponse<PaymentStatusData>;
  if (!result.success) {
    throw new Error(`Djomy vérification: ${result.error?.message ?? result.message}`);
  }

  return result.data;
};

/** Vérifie la signature webhook v1:hex */
export const verifyDjomyWebhookSignature = async (
  rawBody: string,
  signatureHeader: string
): Promise<boolean> => {
  const config = getDjomyConfig();
  const [version, sig] = signatureHeader.split(":");
  if (version !== "v1" || !sig) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(config.clientSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === sig;
};
