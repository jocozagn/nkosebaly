import { NextResponse } from "next/server";
import { getDemoLicensePublicInfo } from "@/lib/license/default-demo-license";

/** Infos d'accès test — Play Store + admin (sans authentification). */
export const GET = async (): Promise<NextResponse> => {
  return NextResponse.json({
    error: false,
    data: getDemoLicensePublicInfo(),
  });
};
