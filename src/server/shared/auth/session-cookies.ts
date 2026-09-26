import "server-only";

import { cookies } from "next/headers";
import { authCookieDomain, authCookieSecure } from "./cookie-domain";

export const ACCESS_TOKEN_COOKIE = "ruvie_access_token";
export const REFRESH_TOKEN_COOKIE = "ruvie_refresh_token";

const commonOptions = {
  httpOnly: false,
  sameSite: "lax" as const,
  secure: authCookieSecure(process.env.NODE_ENV, process.env.APP_URL),
  path: "/",
  domain: authCookieDomain(
    process.env.NODE_ENV,
    process.env.AUTH_COOKIE_DOMAIN,
    process.env.APP_URL,
  ),
};

export async function storeSessionCookies(session: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in?: number;
}) {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, session.access_token, {
    ...commonOptions,
    maxAge: Math.max(60, session.expires_in),
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, session.refresh_token, {
    ...commonOptions,
    httpOnly: true,
    maxAge: session.refresh_expires_in ?? 400 * 24 * 60 * 60,
  });
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  for (const name of [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]) {
    cookieStore.set(name, "", { ...commonOptions, maxAge: 0 });
  }
}
