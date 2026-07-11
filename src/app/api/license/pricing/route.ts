import { NextResponse } from "next/server";
import { getLicensePricing } from "@/lib/admin/store";

/** Prix public licence en ligne (sans auth) */
export const GET = async (): Promise<NextResponse> => {
  const pricing = await getLicensePricing();
  return NextResponse.json({ error: false, data: pricing });
};
