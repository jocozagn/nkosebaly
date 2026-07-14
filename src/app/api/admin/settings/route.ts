import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { getSettings, saveSettings } from "@/lib/admin/store";
import type { AdminSettings, LicensePlan } from "@/lib/admin/types";

const parseLicensePlans = (raw: unknown): LicensePlan[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((item, index) => ({
    id: String((item as LicensePlan)?.id ?? `plan-${index}`),
    duration_months: Number((item as LicensePlan)?.duration_months) || 1,
    price_gnf: Number((item as LicensePlan)?.price_gnf) || 0,
    label: (item as LicensePlan)?.label?.trim() || undefined,
    active: (item as LicensePlan)?.active !== false,
  }));
};

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const settings = await getSettings();
  return NextResponse.json({ error: false, data: settings });
};

export const PUT = async (request: NextRequest): Promise<NextResponse> => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: true, message: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const current = await getSettings();
  const licensePlans = parseLicensePlans(body?.license_plans) ?? current.license_plans;

  const settings = await saveSettings({
    app_name: body?.app_name ?? current.app_name,
    contact_email: body?.contact_email ?? current.contact_email,
    contact_phone: body?.contact_phone ?? current.contact_phone,
    commission_rate: Number(body?.commission_rate ?? current.commission_rate),
    instructor_auto_approve: Boolean(body?.instructor_auto_approve ?? current.instructor_auto_approve),
    license_price: Number(body?.license_price ?? current.license_price),
    license_duration_months: Number(body?.license_duration_months ?? current.license_duration_months) as AdminSettings["license_duration_months"],
    license_plans: licensePlans,
    certificate_price: Number(body?.certificate_price ?? current.certificate_price),
    quiz_pass_threshold: Number(body?.quiz_pass_threshold ?? current.quiz_pass_threshold),
    quiz_max_attempts: Number(body?.quiz_max_attempts ?? current.quiz_max_attempts),
    mobile_app_version: String(body?.mobile_app_version ?? current.mobile_app_version ?? "1.0.0"),
    mobile_app_build: Number(body?.mobile_app_build ?? current.mobile_app_build ?? 1),
    mobile_app_release_notes: String(
      body?.mobile_app_release_notes ?? current.mobile_app_release_notes ?? ""
    ),
  });

  return NextResponse.json({ error: false, data: settings });
};
