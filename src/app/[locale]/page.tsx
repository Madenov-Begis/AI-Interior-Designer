import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { HREFLANG_URLS, LOCALE_URLS, SITE_URL } from "@config/seo";
import { getLandingDictionary } from "@/client/_pages/landing/model/dictionaries";
import { LandingPage } from "@/pages/landing";
import { routing } from "@/i18n/routing";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

const openGraphLocales = {
  en: "en_US",
  ru: "ru_RU",
  uz: "uz_UZ",
} as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Seo" });
  const imageUrl = `${SITE_URL}/${locale}/opengraph-image`;

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: LOCALE_URLS[locale],
      languages: HREFLANG_URLS,
    },
    openGraph: {
      type: "website",
      url: LOCALE_URLS[locale],
      siteName: "Ruvie",
      locale: openGraphLocales[locale],
      alternateLocale: routing.locales
        .filter((item) => item !== locale)
        .map((item) => openGraphLocales[item]),
      title: t("openGraphTitle"),
      description: t("openGraphDescription"),
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: t("openGraphTitle"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("openGraphTitle"),
      description: t("openGraphDescription"),
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function LocalizedLandingPage({
  params,
}: LocalePageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const dictionary = await getLandingDictionary(locale);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Ruvie",
        url: SITE_URL,
        email: "support@ruvie.cc",
      },
      {
        "@type": "WebApplication",
        "@id": `${LOCALE_URLS[locale]}#application`,
        name: "Ruvie",
        url: LOCALE_URLS[locale],
        description: dictionary.seo.description,
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        inLanguage: locale,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${LOCALE_URLS[locale]}#faq`,
        inLanguage: locale,
        mainEntity: dictionary.faq.items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPage dictionary={dictionary} />
    </>
  );
}
