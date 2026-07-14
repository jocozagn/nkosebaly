import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/admin/store";
import {
  isMobileUpdateAvailable,
  resolveMobileAppVersion,
} from "@/lib/mobile/app-version";

/** Version APK mobile — public, sans auth (contrôle au démarrage de l'app). */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "silycor.xyz";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const downloadUrl = `${proto}://${host}/get-app`;

  const clientVersion =
    req.nextUrl.searchParams.get("version")?.trim() ||
    req.headers.get("x-app-version")?.trim() ||
    undefined;

  const clientBuildRaw =
    req.nextUrl.searchParams.get("build")?.trim() ||
    req.headers.get("x-app-build")?.trim() ||
    undefined;

  const clientBuild = clientBuildRaw ? Number(clientBuildRaw) : undefined;

  const settings = await getSettings();
  const latest = resolveMobileAppVersion(settings, downloadUrl);

  const updateAvailable = isMobileUpdateAvailable(latest, {
    version: clientVersion,
    build: Number.isFinite(clientBuild) ? clientBuild : undefined,
  });

  return NextResponse.json({
    error: false,
    data: {
      ...latest,
      update_available: updateAvailable,
      client: clientVersion
        ? { version: clientVersion, build: clientBuild ?? null }
        : null,
    },
  });
};
