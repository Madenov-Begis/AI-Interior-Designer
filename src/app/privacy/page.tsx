import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MarkdownLegalDocument } from "../_components/markdown-legal-document";
import { APP_LOCALE_COOKIE, resolveAppLocale } from "@/i18n/app-locale";

const titles = {
  en: "Privacy policy — Ruvie",
  ru: "Политика конфиденциальности — Ruvie",
  uz: "Maxfiylik siyosati — Ruvie",
} as const;
const descriptions = {
  en: "How Ruvie collects, uses, stores, and protects personal data.",
  ru: "Порядок сбора, использования, хранения и защиты персональных данных в Ruvie.",
  uz: "Ruvie shaxsiy ma’lumotlarni qanday yig‘ishi, ishlatishi, saqlashi va himoya qilishi haqida.",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveAppLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);
  return { title: titles[locale], description: descriptions[locale] };
}

export default function PrivacyPage() {
  return <MarkdownLegalDocument document="privacy-policy" />;
}
