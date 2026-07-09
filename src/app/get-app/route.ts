import { NextRequest, NextResponse } from "next/server";

/**
 * Lien stable à mettre dans le QR code (carte PVC).
 * Sert l'APK depuis /public/apk/ (nginx → Next statique).
 */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "173.212.205.140";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const target = `${proto}://${host}/apk/nkosebaly-latest.apk`;
  return NextResponse.redirect(target, 302);
};

