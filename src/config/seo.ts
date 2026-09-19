import type { Locale } from "@/i18n/routing";

export const SITE_URL = "https://ruvie.cc";

export const LOCALE_URLS: Record<Locale, string> = {
  en: `${SITE_URL}/en`,
  ru: `${SITE_URL}/ru`,
  uz: `${SITE_URL}/uz`,
};

export const HREFLANG_URLS = {
  ...LOCALE_URLS,
  "x-default": LOCALE_URLS.en,
};
