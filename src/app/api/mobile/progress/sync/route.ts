import { NextRequest, NextResponse } from "next/server";
import { syncWatchActivitiesByDeviceId } from "@/lib/admin/store";
import type { WatchActivityPayload } from "@/lib/admin/types";
import { requireMobileDevice } from "@/lib/mobile/require-device";

/** Synchronise les rapports d'activité hors-ligne (mobile) */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  if (!deviceCheck.user) {
    return NextResponse.json({ error: true, message: "Profil requis" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { events?: WatchActivityPayload[] };
  const events = Array.isArray(body.events) ? body.events : [];

  if (events.length === 0) {
    return NextResponse.json({ error: true, message: "Aucun événement" }, { status: 400 });
  }

  if (events.length > 200) {
    return NextResponse.json({ error: true, message: "Lot trop volumineux (max 200)" }, { status: 400 });
  }

  const result = await syncWatchActivitiesByDeviceId(deviceCheck.deviceId, events);
  return NextResponse.json({ error: false, data: result });
};
