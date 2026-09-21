"use client";

import { useEffect, useSyncExternalStore } from "react";
import { captureException } from "@sentry/nextjs";
import { APP_LOCALE_COOKIE } from "@/i18n/app-locale";
import type { Locale } from "@/i18n/routing";

const copy: Record<Locale, { title: string; retry: string }> = {
  en: { title: "Could not open the page", retry: "Try again" },
  ru: { title: "Не удалось открыть страницу", retry: "Попробовать снова" },
  uz: { title: "Sahifani ochib bo‘lmadi", retry: "Qayta urinib ko‘rish" },
};

function browserLocale(): Locale {
  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${APP_LOCALE_COOKIE}=`))
    ?.split("=")[1];
  return value === "en" || value === "uz" ? value : "ru";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const locale = useSyncExternalStore<Locale>(
    () => () => undefined,
    browserLocale,
    () => "ru",
  );
  useEffect(() => {
    captureException(error);
  }, [error]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <html lang={locale}>
      <body>
        <main>
          <h1>{copy[locale].title}</h1>
          <button type="button" onClick={reset}>
            {copy[locale].retry}
          </button>
        </main>
      </body>
    </html>
  );
}
