import "server-only";

import type { Locale } from "@/i18n/routing";
import type { LandingDictionary } from "./dictionary";

const dictionaries: Record<
  Locale,
  () => Promise<{ default: LandingDictionary }>
> = {
  en: () => import("./locales/en"),
  ru: () => import("./locales/ru"),
  uz: () => import("./locales/uz"),
};

export async function getLandingDictionary(
  locale: Locale,
): Promise<LandingDictionary> {
  return (await dictionaries[locale]()).default;
}
