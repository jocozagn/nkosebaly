import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { getAnalyticsSummary } from "@/lib/admin/store";

/** Statistiques d'utilisation des élèves (temps, leçons, cours populaires) */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const daysParam = req.nextUrl.searchParams.get("days");
  const days = Number(daysParam ?? 7);

  const summary = await getAnalyticsSummary(Number.isNaN(days) ? 7 : days);
  return NextResponse.json({ error: false, data: summary });
};
