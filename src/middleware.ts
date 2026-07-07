import { NextResponse, NextRequest } from "next/server";
import { LICENSE_COOKIE, PROFILE_COOKIE } from "@/lib/license/cookies";

/**
 * Protège les routes étudiant — connexion + licence + profil requis
 */
export function middleware(request: NextRequest) {
  const authToken = request.cookies.get("auth_token")?.value;
  const licenseCardId = request.cookies.get(LICENSE_COOKIE)?.value;
  const profileComplete = request.cookies.get(PROFILE_COOKIE)?.value === "1";
  const { pathname } = request.nextUrl;

  if (!authToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Pages d'onboarding accessibles sans licence ou profil complet
  if (pathname.startsWith("/dashboard/activate-license")) {
    const response = NextResponse.next();
    response.headers.set("Authorization", `Bearer ${authToken}`);
    return response;
  }

  if (!licenseCardId) {
    return NextResponse.redirect(new URL("/dashboard/activate-license", request.url));
  }

  if (pathname.startsWith("/dashboard/complete-profile")) {
    const response = NextResponse.next();
    response.headers.set("Authorization", `Bearer ${authToken}`);
    return response;
  }

  if (!profileComplete) {
    return NextResponse.redirect(new URL("/dashboard/complete-profile", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("Authorization", `Bearer ${authToken}`);
  return response;
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
