import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getRequestBaseUrl } from "@/lib/mobile/request-base-url";
import { createWebSession, WEB_SESSION_TTL_MS } from "@/lib/webSessionStore";

/** Génère un nouveau QR code de connexion web */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const session = await createWebSession();
  const webUrl = getRequestBaseUrl(request);

  // Payload scanné par l'app mobile N'ko
  const qrPayload = JSON.stringify({
    action: "web_login",
    session_token: session.token,
    confirm_url: `${webUrl}/api/web-session/confirm`,
  });

  const qrImage = await QRCode.toDataURL(qrPayload, {
    width: 280,
    margin: 2,
    color: { dark: "#7D4E2D", light: "#ffffff" },
  });

  return NextResponse.json({
    error: false,
    data: {
      token: session.token,
      qr_image: qrImage,
      expires_in: WEB_SESSION_TTL_MS / 1000,
      expires_at: session.expiresAt,
    },
  });
};
