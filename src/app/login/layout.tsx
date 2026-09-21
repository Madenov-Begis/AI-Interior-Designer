import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { APP_NAME } from "@/shared/config";
import { APP_LOCALE_COOKIE, resolveAppLocale } from "@/i18n/app-locale";
import { LocalizedSkipLink } from "@/shared/providers";
import { LocalizedAppProvider } from "../_components/localized-app-provider";

const titles = {
  en: `Sign in — ${APP_NAME}`,
  ru: `Вход — ${APP_NAME}`,
  uz: `Kirish — ${APP_NAME}`,
} as const;
const descriptions = {
  en: "Sign in to create and manage your AI interior projects.",
  ru: "Войдите, чтобы создавать проекты AI-дизайна интерьера и управлять ими.",
  uz: "AI interyer loyihalarini yaratish va boshqarish uchun tizimga kiring.",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveAppLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);
  return {
    title: titles[locale],
    description: descriptions[locale],
    robots: { index: false, follow: true },
  };
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <LocalizedAppProvider>
      <LocalizedSkipLink />
      {children}
    </LocalizedAppProvider>
  );
}
