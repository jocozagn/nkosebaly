import { describe, expect, it, beforeEach } from "vitest";
import { extractCertificateIdFromWebhook } from "@/lib/djomy/webhook";
import { verifyDjomyWebhookSignature } from "@/lib/djomy/client";

describe("extractCertificateIdFromWebhook", () => {
  it("lit certificate_id depuis metadata racine", () => {
    const id = extractCertificateIdFromWebhook({
      eventType: "payment.success",
      metadata: { certificate_id: "cert-abc" },
    });
    expect(id).toBe("cert-abc");
  });

  it("lit certificate_id depuis data.metadata", () => {
    const id = extractCertificateIdFromWebhook({
      eventType: "payment.success",
      data: { metadata: { certificate_id: "cert-data" } },
    });
    expect(id).toBe("cert-data");
  });

  it("utilise merchantPaymentReference en fallback", () => {
    const id = extractCertificateIdFromWebhook({
      eventType: "payment.success",
      data: { merchantPaymentReference: "cert-merchant-ref" },
    });
    expect(id).toBe("cert-merchant-ref");
  });
});

describe("verifyDjomyWebhookSignature", () => {
  beforeEach(() => {
    process.env.DJOMY_CLIENT_ID = "client-test";
    process.env.DJOMY_CLIENT_SECRET = "secret-test";
    process.env.DJOMY_PARTNER_DOMAIN = "silycor.xyz";
  });

  it("valide une signature v1 correcte", async () => {
    const rawBody = '{"eventType":"payment.success"}';
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode("secret-test"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const ok = await verifyDjomyWebhookSignature(rawBody, `v1:${hex}`);
    expect(ok).toBe(true);
  });

  it("rejette une signature incorrecte", async () => {
    const ok = await verifyDjomyWebhookSignature("{}", "v1:deadbeef");
    expect(ok).toBe(false);
  });
});
