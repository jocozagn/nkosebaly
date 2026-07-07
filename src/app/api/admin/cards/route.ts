import { NextRequest, NextResponse } from "next/server";
import { generateLicenseCards, getLicenseCards, saveLicenseCard } from "@/lib/admin/store";
import type { CardDurationMonths, CardStatus } from "@/lib/admin/types";

const isAdmin = (req: NextRequest): boolean => Boolean(req.cookies.get("admin_token")?.value);

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  return NextResponse.json({ error: false, data: await getLicenseCards() });
};

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  const body = await req.json();

  if (body?.action === "generate") {
    const count = Math.min(Number(body.count ?? 1), 50);
    const duration = (Number(body.duration_months ?? 3) as CardDurationMonths);
    const cards = await generateLicenseCards(count, duration);
    return NextResponse.json({ error: false, data: cards });
  }

  if (body?.id && body?.status) {
    const cards = await getLicenseCards();
    const card = cards.find((c) => c.id === body.id);
    if (!card) return NextResponse.json({ error: true, message: "Carte introuvable" }, { status: 404 });
    const updated = await saveLicenseCard({ ...card, status: body.status as CardStatus });
    return NextResponse.json({ error: false, data: updated });
  }

  return NextResponse.json({ error: true, message: "Action invalide" }, { status: 400 });
};
