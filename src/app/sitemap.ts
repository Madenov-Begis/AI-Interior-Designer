import type { MetadataRoute } from "next";
import { HREFLANG_URLS, LOCALE_URLS, SITE_URL } from "@config/seo";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const localizedPages = routing.locales.map((locale) => ({
    url: LOCALE_URLS[locale],
    changeFrequency: "weekly" as const,
    priority: locale === routing.defaultLocale ? 1 : 0.9,
    alternates: { languages: HREFLANG_URLS },
  }));

  return [
    ...localizedPages,
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/offer`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
