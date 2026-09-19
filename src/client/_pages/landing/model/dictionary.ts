import type { Locale } from "@/i18n/routing";

export interface LandingDictionary {
  locale: Locale;
  localeName: string;
  seo: {
    title: string;
    description: string;
    openGraphTitle: string;
    openGraphDescription: string;
  };
  skipLink: string;
  header: {
    logoLabel: string;
    navigationLabel: string;
    examples: string;
    process: string;
    pricing: string;
    login: string;
    languageLabel: string;
  };
  hero: {
    eyebrow: string;
    title: readonly [string, string, string];
    description: string;
    primaryCta: string;
    examplesCta: string;
    freeCredits: string;
    highlights: readonly string[];
    resultAlt: string;
    resultLabel: string;
    sourceAlt: string;
    sourceLabel: string;
    geometryTitle: string;
    geometryCopy: string;
  };
  examples: {
    heading: readonly [string, string];
    description: string;
    aiLabel: string;
    items: readonly { title: string; style: string; alt: string }[];
  };
  process: {
    eyebrow: string;
    heading: string;
    description: string;
    imageAlt: string;
    steps: readonly { title: string; copy: string }[];
  };
  stories: {
    eyebrow: string;
    heading: string;
    items: readonly { title: string; text: string }[];
  };
  workflow: {
    eyebrow: string;
    heading: string;
    description: string;
    items: readonly string[];
    cta: string;
    credits: string;
    sourceAlt: string;
    sourceLabel: string;
    resultAlt: string;
    resultLabel: string;
  };
  pricing: {
    heading: string;
    description: string;
    loading: string;
    error: string;
    retry: string;
    popular: string;
    packageTitle: string;
    packageDescription: string;
    credits: string;
    enoughFor: string;
    generations: string;
    neverExpire: string;
    buy: string;
    starterTitle: string;
    starterCopy: string;
    freeCta: string;
  };
  faq: {
    eyebrow: string;
    heading: string;
    description: string;
    items: readonly { question: string; answer: string }[];
  };
  finalCta: {
    eyebrow: string;
    heading: string;
    description: string;
    cta: string;
    imageAlt: string;
  };
  footer: {
    logoLabel: string;
    navigationLabel: string;
    product: string;
    process: string;
    examples: string;
    login: string;
    documents: string;
    privacy: string;
    offer: string;
    tagline: string;
  };
}
