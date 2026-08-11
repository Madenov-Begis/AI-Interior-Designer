import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonClassName, RuvieLogo } from "@/shared/ui";
import { marketingCtaClassName } from "./cta-style";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5">
      <div className="mx-auto flex h-15 max-w-[1280px] items-center justify-between rounded-full border border-white/10 bg-[#17181a]/90 px-3 pl-4 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:pl-5">
        <RuvieLogo href="/" />
        <nav
          className="hidden items-center gap-7 text-sm text-white/55 md:flex"
          aria-label="Основная навигация"
        >
          <a
            className="transition-colors hover:text-foreground"
            href="#examples"
          >
            Примеры
          </a>
          <a
            className="transition-colors hover:text-foreground"
            href="#process"
          >
            Как это работает
          </a>
          <a
            className="transition-colors hover:text-foreground"
            href="#pricing"
          >
            Тарифы
          </a>
        </nav>
        <Link
          href="/app"
          className={buttonClassName(
            "default",
            marketingCtaClassName("h-10 rounded-full px-5 shadow-none"),
            "sm",
          )}
        >
          <span className="hidden sm:inline">Загрузить фото бесплатно</span>
          <span className="sm:hidden">Начать</span>
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
