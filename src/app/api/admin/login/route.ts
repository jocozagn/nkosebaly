import { NextRequest, NextResponse } from "next/server";

/** Connexion administrateur (email + mot de passe) */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = await request.json().catch(() => null);
  const email = body?.email as string | undefined;
  const password = body?.password as string | undefined;

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@balandou.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  if (!email || !password) {
    return NextResponse.json({ error: true, message: "Email et mot de passe requis" }, { status: 400 });
  }

  if (email !== adminEmail || password !== adminPassword) {
    return NextResponse.json({ error: true, message: "Identifiants incorrects" }, { status: 401 });
  }

  const response = NextResponse.json({ error: false, message: "Connexion réussie" });

  response.cookies.set("admin_token", `admin-${crypto.randomUUID()}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return response;
};
