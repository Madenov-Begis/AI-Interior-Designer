"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { APP_LOCALE_COOKIE } from "@/i18n/app-locale";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/shared/lib";

export function AppLanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const router = useRouter();

  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-border bg-background/70 p-1",
        className,
      )}
      aria-label="Language"
    >
      {routing.locales.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={locale === item}
          className="min-h-9 rounded-full px-2.5 text-xs font-bold uppercase text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-secondary aria-pressed:text-foreground"
          onClick={() => {
            document.cookie = `${APP_LOCALE_COOKIE}=${item}; Path=/; Max-Age=31536000; SameSite=Lax`;
            document.documentElement.lang = item;
            router.refresh();
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
