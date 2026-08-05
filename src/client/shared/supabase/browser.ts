"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import Cookies from "js-cookie";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

function cookieAttributes(options: CookieOptions): Cookies.CookieAttributes {
  const { expires, maxAge, sameSite } = options;

  return {
    path: options.path,
    domain: options.domain,
    secure: options.secure,
    expires:
      expires ??
      (typeof maxAge === "number"
        ? new Date(Date.now() + maxAge * 1_000)
        : undefined),
    sameSite:
      sameSite === true
        ? "strict"
        : typeof sameSite === "string"
          ? sameSite
          : undefined,
  };
}

export function createSupabaseBrowserClient() {
  browserClient ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () =>
          Object.entries(Cookies.get()).map(([name, value]) => ({
            name,
            value,
          })),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            Cookies.set(name, value, cookieAttributes(options));
          });
        },
      },
    },
  );
  return browserClient;
}
