import { NextRequest, NextResponse } from "next/server";

/** Noms des cookies licence / profil — fichier léger compatible Edge (middleware) */
export const DEVICE_COOKIE = "balandou_device_id";
export const LICENSE_COOKIE = "license_card_id";
export const PROFILE_COOKIE = "student_profile_complete";

export const getAuthToken = (req: NextRequest): string | null =>
  req.cookies.get("auth_token")?.value ?? null;

export const getDeviceId = (req: NextRequest): string | null =>
  req.cookies.get(DEVICE_COOKIE)?.value ?? null;

interface CookieOpts {
  secure: boolean;
  sameSite: "lax" | "strict";
}

export const setLicenseCookies = (
  response: NextResponse,
  deviceId: string,
  licenseCardId: string,
  options?: CookieOpts
): void => {
  const secure = options?.secure ?? process.env.NODE_ENV === "production";
  const sameSite = options?.sameSite ?? "strict";

  const cookieBase = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  };

  response.cookies.set(DEVICE_COOKIE, deviceId, cookieBase);
  response.cookies.set(LICENSE_COOKIE, licenseCardId, cookieBase);
};

export const setProfileCompleteCookie = (response: NextResponse, options?: CookieOpts): void => {
  const secure = options?.secure ?? process.env.NODE_ENV === "production";
  const sameSite = options?.sameSite ?? "strict";

  response.cookies.set(PROFILE_COOKIE, "1", {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
};

export const clearLicenseCookies = (response: NextResponse): void => {
  response.cookies.set(LICENSE_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(PROFILE_COOKIE, "", { path: "/", maxAge: 0 });
};
