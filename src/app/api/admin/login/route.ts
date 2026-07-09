import { NextRequest, NextResponse } from "next/server";
import { getAdminCredentials, signAdminToken, ADMIN_TOKEN_COOKIE } from "@/lib/admin/auth";

/** Connexion administrateur (email + mot de passe) */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = await request.json().catch(() => null);
  const email = body?.email as string | undefined;
  const password = body?.password as string | undefined;

  const credentials = getAdminCredentials();
  if (!credentials) {
    return NextResponse.json(
      { error: true, message: "Configuration admin incomplète sur le serveur" },
      { status: 503 }
    );
  }

  if (!email || !password) {
    return NextResponse.json({ error: true, message: "Email et mot de passe requis" }, { status: 400 });
  }

  if (email !== credentials.email || password !== credentials.password) {
    return NextResponse.json({ error: true, message: "Identifiants incorrects" }, { status: 401 });
  }

  const adminToken = signAdminToken(credentials.email);
  if (!adminToken) {
    return NextResponse.json(
      {
        error: true,
        message: "Configuration serveur incomplète (ADMIN_SESSION_SECRET). Contactez l'administrateur système.",
      },
      { status: 503 }
    );
  }

  const response = NextResponse.json({ error: false, message: "Connexion réussie" });

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttpsRequest =
    forwardedProto === "https" || request.nextUrl.protocol === "https:";

  response.cookies.set(ADMIN_TOKEN_COOKIE, adminToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && isHttpsRequest,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return response;
};
