import { NextResponse } from "next/server";

/** Déconnexion administrateur */
export const POST = async (): Promise<NextResponse> => {
  const response = NextResponse.json({ error: false, message: "Déconnecté" });
  response.cookies.delete("admin_token");
  return response;
};
