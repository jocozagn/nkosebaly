import { NextRequest } from "next/server";

export interface CookieWriteOptions {
  secure: boolean;
  sameSite: "lax" | "strict";
}

/** Options cookies selon HTTP/HTTPS réel (VPS en IP = HTTP) */
export const getCookieWriteOptions = (request?: NextRequest): CookieWriteOptions => {
  const forwardedProto = request?.headers.get("x-forwarded-proto");
  const isHttpsRequest =
    forwardedProto === "https" || request?.nextUrl.protocol === "https:";

  return {
    secure: process.env.NODE_ENV === "production" && Boolean(isHttpsRequest),
    sameSite: "lax",
  };
};
