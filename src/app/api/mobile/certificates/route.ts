import { NextRequest, NextResponse } from "next/server";
import { getStudentCertificatesOverviewByDeviceId } from "@/lib/admin/store";
import { requireMobileDevice } from "@/lib/mobile/require-device";

/** Certificats et éligibilité — app mobile */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const deviceCheck = await requireMobileDevice(req);
  if (!deviceCheck.ok) return deviceCheck.response;

  if (!deviceCheck.user) {
    return NextResponse.json({ error: true, message: "Profil requis" }, { status: 403 });
  }

  const overview = await getStudentCertificatesOverviewByDeviceId(deviceCheck.deviceId);
  if (!overview) {
    return NextResponse.json({ error: true, message: "Profil introuvable" }, { status: 404 });
  }

  return NextResponse.json({ error: false, data: overview });
};
