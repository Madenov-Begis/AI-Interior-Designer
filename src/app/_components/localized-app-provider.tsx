import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { APP_LOCALE_COOKIE, resolveAppLocale } from "@/i18n/app-locale";
import { AppIntlProvider } from "@/shared/providers";

export async function LocalizedAppProvider({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = resolveAppLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  return <AppIntlProvider locale={locale}>{children}</AppIntlProvider>;
}
