import "server-only";

import type { Session } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const ACCESS_TOKEN_COOKIE = "roova_access_token";
export const REFRESH_TOKEN_COOKIE = "roova_refresh_token";

const commonOptions = {
  httpOnly: false,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

function isLegacySupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

export async function storeSessionCookies(session: Session) {
  const cookieStore = await cookies();

  for (const { name } of cookieStore.getAll()) {
    if (isLegacySupabaseAuthCookie(name)) {
      cookieStore.set(name, "", { ...commonOptions, maxAge: 0 });
    }
  }

  cookieStore.set(ACCESS_TOKEN_COOKIE, session.access_token, {
    ...commonOptions,
    maxAge: Math.max(60, session.expires_in),
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, session.refresh_token, {
    ...commonOptions,
    maxAge: 400 * 24 * 60 * 60,
  });
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  const names = new Set([ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]);

  for (const { name } of cookieStore.getAll()) {
    if (isLegacySupabaseAuthCookie(name)) names.add(name);
  }

  for (const name of names) {
    cookieStore.set(name, "", { ...commonOptions, maxAge: 0 });
  }
}
