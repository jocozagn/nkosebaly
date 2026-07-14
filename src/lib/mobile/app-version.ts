import type { AdminSettings } from "@/lib/admin/types";

/** Version mobile par défaut — alignée sur mobile/pubspec.yaml (1.0.0+1) */
export const DEFAULT_MOBILE_APP_VERSION = "1.0.1";
export const DEFAULT_MOBILE_APP_BUILD = 2;

export interface MobileAppVersionInfo {
  version: string;
  build: number;
  download_url: string;
  release_notes: string;
}

/** Lit la version mobile publiée (admin ou variables d'environnement). */
export const resolveMobileAppVersion = (
  settings: AdminSettings,
  downloadUrl: string
): MobileAppVersionInfo => {
  const envVersion = process.env.MOBILE_APP_VERSION?.trim();
  const envBuild = Number(process.env.MOBILE_APP_BUILD);

  const version =
    envVersion ||
    settings.mobile_app_version?.trim() ||
    DEFAULT_MOBILE_APP_VERSION;

  const build =
    Number.isFinite(envBuild) && envBuild > 0
      ? envBuild
      : Math.max(1, Number(settings.mobile_app_build) || DEFAULT_MOBILE_APP_BUILD);

  const releaseNotes =
    settings.mobile_app_release_notes?.trim() ||
    "Corrections et améliorations KARAMOO SEEBALI.";

  return {
    version,
    build,
    download_url: downloadUrl,
    release_notes: releaseNotes,
  };
};

/** Compare deux numéros semver (ex. 1.0.1 > 1.0.0). */
export const compareSemver = (left: string, right: string): number => {
  const parse = (value: string): number[] =>
    value.split(".").map((part) => Number.parseInt(part, 10) || 0);

  const a = parse(left);
  const b = parse(right);
  const length = Math.max(a.length, b.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
};

/** True si la version serveur est plus récente que celle du client. */
export const isMobileUpdateAvailable = (
  server: Pick<MobileAppVersionInfo, "version" | "build">,
  client?: { version?: string; build?: number }
): boolean => {
  if (!client) return false;

  const clientBuild = Number(client.build);
  if (Number.isFinite(clientBuild) && clientBuild > 0) {
    if (server.build > clientBuild) return true;
    if (server.build < clientBuild) return false;
  }

  const clientVersion = client.version?.trim();
  if (!clientVersion) return false;

  return compareSemver(server.version, clientVersion) > 0;
};
