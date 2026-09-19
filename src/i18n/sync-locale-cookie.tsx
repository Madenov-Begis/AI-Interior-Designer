"use client";

import { useEffect } from "react";
import { APP_LOCALE_COOKIE } from "./app-locale";
import type { Locale } from "./routing";

export function SyncLocaleCookie({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.cookie = `${APP_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
