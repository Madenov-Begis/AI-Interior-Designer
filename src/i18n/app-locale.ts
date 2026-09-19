import type { Locale } from "./routing";

export const APP_LOCALE_COOKIE = "NEXT_LOCALE";

export function resolveAppLocale(value: string | null | undefined): Locale {
  return value === "en" || value === "uz" || value === "ru" ? value : "ru";
}
