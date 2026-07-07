import { NextRequest, NextResponse } from "next/server";
import { getWebSession } from "@/lib/webSessionStore";

/** Finalise la connexion web : pose le cookie auth après confirmation mobile */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = await request.json().catch(() => null);
  const token = body?.token as string | undefined;

  if (!token) {
    return NextResponse.json(
      { error: true, message: "Token requis" },
      { status: 400 }
    );
  }

  const session = getWebSession(token);

  if (!session || session.status !== "confirmed" || !session.authToken) {
    return NextResponse.json(
      { error: true, message: "Session non confirmée" },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    error: false,
    message: "Connexion réussie",
  });

  response.cookies.set("auth_token", session.authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  });

  return response;
};
