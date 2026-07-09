import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { generateLicenseCards, getLicenseCards, revokeLicenseCardDevice, saveLicenseCard } from "@/lib/admin/store";
import type { CardDurationMonths, CardStatus } from "@/lib/admin/types";

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  return NextResponse.json({ error: false, data: await getLicenseCards() });
};

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  const body = await req.json();

  if (body?.action === "generate") {
    const count = Math.min(Number(body.count ?? 1), 50);
    const duration = (Number(body.duration_months ?? 3) as CardDurationMonths);
    const allowedCourseIds = Array.isArray(body.allowed_course_ids)
      ? body.allowed_course_ids.map(String).filter(Boolean)
      : [];
    const cardPrice = body.card_price_gnf != null ? Number(body.card_price_gnf) : undefined;
    const certPrice = body.certificate_price_gnf != null ? Number(body.certificate_price_gnf) : undefined;

    const cards = await generateLicenseCards(count, duration, {
      allowed_course_ids: allowedCourseIds,
      card_price_gnf: Number.isFinite(cardPrice) && (cardPrice ?? 0) > 0 ? cardPrice : undefined,
      certificate_price_gnf: Number.isFinite(certPrice) && (certPrice ?? 0) > 0 ? certPrice : undefined,
    });
    return NextResponse.json({ error: false, data: cards });
  }

  if (body?.action === "revoke_device" && body?.id) {
    const updated = await revokeLicenseCardDevice(String(body.id));
    if (!updated) return NextResponse.json({ error: true, message: "Carte introuvable" }, { status: 404 });
    return NextResponse.json({ error: false, data: updated });
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
