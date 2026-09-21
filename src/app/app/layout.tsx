import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { ProtectedRouteGuard } from "@/features/auth/index.client";
import { APP_LOCALE_COOKIE, resolveAppLocale } from "@/i18n/app-locale";
import { LocalizedSkipLink } from "@/shared/providers";
import { LocalizedAppProvider } from "../_components/localized-app-provider";

const titles = {
  en: "Interior workspace — Ruvie",
  ru: "Рабочее пространство — Ruvie",
  uz: "Interyer ish maydoni — Ruvie",
} as const;
const descriptions = {
  en: "Create, refine, and manage AI interior designs in Ruvie.",
  ru: "Создавайте, дорабатывайте и управляйте AI-дизайнами интерьера в Ruvie.",
  uz: "Ruvie’da AI interyer dizaynlarini yarating, takomillashtiring va boshqaring.",
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

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <LocalizedAppProvider>
      <LocalizedSkipLink />
      <ProtectedRouteGuard>{children}</ProtectedRouteGuard>
    </LocalizedAppProvider>
  );
}
