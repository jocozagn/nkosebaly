import { NextRequest, NextResponse } from "next/server";
import { getUsers, saveUser } from "@/lib/admin/store";

const isAdmin = (req: NextRequest): boolean => Boolean(req.cookies.get("admin_token")?.value);

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  return NextResponse.json({ error: false, data: await getUsers() });
};

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(req)) return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  const body = await req.json();
  if (!body?.name) return NextResponse.json({ error: true, message: "Nom requis" }, { status: 400 });
  const user = await saveUser({
    id: crypto.randomUUID(),
    name: body.name,
    device_id: body.device_id,
    license_card_id: body.license_card_id,
    enrolled_course_ids: body.enrolled_course_ids ?? [],
    progress_percent: Number(body.progress_percent ?? 0),
    created_at: new Date().toISOString(),
  });
  return NextResponse.json({ error: false, data: user });
};
