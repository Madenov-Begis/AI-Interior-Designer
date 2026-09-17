import Link from "next/link";
import { LogIn } from "lucide-react";
import { buttonClassName, RuvieLogo } from "@/shared/ui";
import { marketingCtaClassName } from "./cta-style";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 py-2">
      <div className="landing-shell">
        <div className="flex h-14 items-center justify-between rounded-full border border-white/10 bg-[#17181a]/78 px-4 shadow-[0_12px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:px-5">
          <RuvieLogo href="/" />
          <nav
            className="hidden items-center gap-7 text-sm text-white/55 md:flex"
            aria-label="Основная навигация"
          >
            <a
              className="transition-colors hover:text-foreground focus-visible:text-foreground"
              href="#examples"
            >
              Примеры
            </a>
            <a
              className="transition-colors hover:text-foreground focus-visible:text-foreground"
              href="#process"
            >
              Как это работает
            </a>
            <a
              className="transition-colors hover:text-foreground focus-visible:text-foreground"
              href="#pricing"
            >
              Пакеты
            </a>
          </nav>
          <Link
            href="/login"
            className={buttonClassName(
              "default",
              marketingCtaClassName(
                "h-11 min-w-28 rounded-full px-5 shadow-none",
              ),
              "sm",
            )}
          >
            Войти
            <LogIn className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
