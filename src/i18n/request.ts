import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { getLandingDictionary } from "@/client/_pages/landing/model/dictionaries";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const requestedLocale = locale ?? (await requestLocale);
  const resolvedLocale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;
  const dictionary = await getLandingDictionary(resolvedLocale);

  return {
    locale: resolvedLocale,
    messages: {
      Seo: dictionary.seo,
      Pricing: dictionary.pricing,
    },
  };
});
