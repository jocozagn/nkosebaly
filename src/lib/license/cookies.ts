import { NextRequest, NextResponse } from "next/server";

/** Noms des cookies licence / profil — fichier léger compatible Edge (middleware) */
export const DEVICE_COOKIE = "balandou_device_id";
export const LICENSE_COOKIE = "license_card_id";
export const PROFILE_COOKIE = "student_profile_complete";

export const getAuthToken = (req: NextRequest): string | null =>
  req.cookies.get("auth_token")?.value ?? null;

export const getDeviceId = (req: NextRequest): string | null =>
  req.cookies.get(DEVICE_COOKIE)?.value ?? null;

export const setLicenseCookies = (
  response: NextResponse,
  deviceId: string,
  licenseCardId: string
): void => {
  const cookieBase = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  };

  response.cookies.set(DEVICE_COOKIE, deviceId, cookieBase);
  response.cookies.set(LICENSE_COOKIE, licenseCardId, cookieBase);
};

export const setProfileCompleteCookie = (response: NextResponse): void => {
  response.cookies.set(PROFILE_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
};

export const clearLicenseCookies = (response: NextResponse): void => {
  response.cookies.set(LICENSE_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(PROFILE_COOKIE, "", { path: "/", maxAge: 0 });
};
