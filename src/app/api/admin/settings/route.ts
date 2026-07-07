import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/admin/store";

const isAdmin = (request: NextRequest): boolean => Boolean(request.cookies.get("admin_token")?.value);

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const settings = await getSettings();
  return NextResponse.json({ error: false, data: settings });
};

export const PUT = async (request: NextRequest): Promise<NextResponse> => {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const current = await getSettings();

  const settings = await saveSettings({
    app_name: body?.app_name ?? current.app_name,
    contact_email: body?.contact_email ?? current.contact_email,
    contact_phone: body?.contact_phone ?? current.contact_phone,
    commission_rate: Number(body?.commission_rate ?? current.commission_rate),
    instructor_auto_approve: Boolean(body?.instructor_auto_approve ?? current.instructor_auto_approve),
    certificate_price: Number(body?.certificate_price ?? current.certificate_price),
    quiz_pass_threshold: Number(body?.quiz_pass_threshold ?? current.quiz_pass_threshold),
    quiz_max_attempts: Number(body?.quiz_max_attempts ?? current.quiz_max_attempts),
  });

  return NextResponse.json({ error: false, data: settings });
};
