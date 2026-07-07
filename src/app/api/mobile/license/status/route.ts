import { NextRequest, NextResponse } from "next/server";
import { getActiveLicenseByDeviceId } from "@/lib/admin/store";

/** Statut licence mobile */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const deviceId = req.headers.get("x-device-id")?.trim();
  if (!deviceId) {
    return NextResponse.json({ error: true, message: "X-Device-Id requis" }, { status: 401 });
  }

  const license = await getActiveLicenseByDeviceId(deviceId);
  if (!license) {
    return NextResponse.json({ error: false, data: { active: false } });
  }

  return NextResponse.json({
    error: false,
    data: {
      active: true,
      expires_at: license.card.expires_at,
      duration_months: license.card.duration_months,
      user_name: license.user?.name ?? "",
      profile_completed: Boolean(license.user?.profile_completed),
    },
  });
};
