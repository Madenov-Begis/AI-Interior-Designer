import { hasLocale } from "next-intl";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ru", "uz"],
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: false,
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];

export function isLocale(value: string): value is Locale {
  return hasLocale(routing.locales, value);
}
