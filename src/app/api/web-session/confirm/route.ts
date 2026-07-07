import { NextRequest, NextResponse } from "next/server";
import { confirmWebSession } from "@/lib/webSessionStore";

/** Endpoint appelé par l'app mobile après scan du QR */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = await request.json().catch(() => null);

  const sessionToken = body?.session_token as string | undefined;
  const deviceId = body?.device_id as string | undefined;

  if (!sessionToken || !deviceId) {
    return NextResponse.json(
      { error: true, message: "session_token et device_id requis" },
      { status: 400 }
    );
  }

  const result = confirmWebSession(sessionToken, deviceId);

  if (!result.success) {
    return NextResponse.json(
      { error: true, message: result.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    error: false,
    message: result.message,
    data: { confirmed: true },
  });
};
