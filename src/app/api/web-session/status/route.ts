import { NextRequest, NextResponse } from "next/server";
import { getWebSession } from "@/lib/webSessionStore";

/** Vérifie l'état d'une session (polling côté web) */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: true, message: "Token requis" },
      { status: 400 }
    );
  }

  const session = await getWebSession(token);

  if (!session) {
    return NextResponse.json(
      { error: true, message: "Session introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    error: false,
    data: {
      status: session.status,
      expires_at: session.expiresAt,
      has_auth_token: Boolean(session.authToken),
    },
  });
};
