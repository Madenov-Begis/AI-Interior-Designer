import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MarkdownLegalDocument } from "../_components/markdown-legal-document";
import { APP_LOCALE_COOKIE, resolveAppLocale } from "@/i18n/app-locale";

const titles = {
  en: "Public offer — Ruvie",
  ru: "Публичная оферта — Ruvie",
  uz: "Ommaviy oferta — Ruvie",
} as const;
const descriptions = {
  en: "Terms for accessing and using the Ruvie service.",
  ru: "Условия предоставления доступа к сервису Ruvie и его использования.",
  uz: "Ruvie xizmatidan foydalanish va unga kirish shartlari.",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveAppLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);
  return { title: titles[locale], description: descriptions[locale] };
}

export default function OfferPage() {
  return <MarkdownLegalDocument document="public-offer" />;
}
