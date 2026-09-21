"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { appMessages } from "@/i18n/app-messages";
import type { Locale } from "@/i18n/routing";
import { SyncLocaleCookie } from "@/i18n/sync-locale-cookie";

export function AppIntlProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={appMessages[locale]}>
      <SyncLocaleCookie locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
