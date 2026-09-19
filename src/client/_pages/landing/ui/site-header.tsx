import Link from "next/link";
import { LogIn } from "lucide-react";
import { buttonClassName, RuvieLogo } from "@/shared/ui";
import { LocaleLink } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import type { LandingDictionary } from "../model/dictionary";
import { marketingCtaClassName } from "./cta-style";

export function SiteHeader({ dictionary }: { dictionary: LandingDictionary }) {
  return (
    <header className="sticky top-0 z-50 py-2">
      <div className="landing-shell">
        <div className="flex h-14 items-center justify-between rounded-full border border-white/10 bg-[#17181a]/78 px-4 shadow-[0_12px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:px-5">
          <RuvieLogo
            href={`/${dictionary.locale}`}
            ariaLabel={dictionary.header.logoLabel}
          />
          <nav
            className="hidden items-center gap-7 text-sm text-white/55 md:flex"
            aria-label={dictionary.header.navigationLabel}
          >
            <a
              className="transition-colors hover:text-foreground focus-visible:text-foreground"
              href="#examples"
            >
              {dictionary.header.examples}
            </a>
            <a
              className="transition-colors hover:text-foreground focus-visible:text-foreground"
              href="#process"
            >
              {dictionary.header.process}
            </a>
            <a
              className="transition-colors hover:text-foreground focus-visible:text-foreground"
              href="#pricing"
            >
              {dictionary.header.pricing}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <nav
              aria-label={dictionary.header.languageLabel}
              className="flex items-center rounded-full border border-white/10 bg-black/20 p-1"
            >
              {routing.locales.map((locale) => (
                <LocaleLink
                  key={locale}
                  href="/"
                  locale={locale}
                  aria-current={
                    dictionary.locale === locale ? "page" : undefined
                  }
                  className="rounded-full px-2 py-1 text-[11px] font-bold uppercase text-white/55 transition-colors hover:text-white aria-[current=page]:bg-white/12 aria-[current=page]:text-white"
                >
                  {locale}
                </LocaleLink>
              ))}
            </nav>
            <Link
              href="/login"
              aria-label={dictionary.header.login}
              className={buttonClassName(
                "default",
                marketingCtaClassName(
                  "h-11 min-w-0 rounded-full px-4 shadow-none sm:min-w-28 sm:px-5",
                ),
                "sm",
              )}
            >
              <span className="hidden sm:inline">
                {dictionary.header.login}
              </span>
              <LogIn className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
