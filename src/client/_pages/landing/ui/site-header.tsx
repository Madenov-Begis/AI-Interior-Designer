import Link from "next/link";
import { ArrowUpRight, Sparkle } from "lucide-react";
import { buttonClassName } from "@/shared/ui";
import { APP_NAME } from "@/shared/config";
import { marketingCtaClassName } from "./cta-style";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label={`${APP_NAME} — главная`}
        >
          <Sparkle
            className="size-5 fill-primary text-primary"
            aria-hidden="true"
          />
          <span className="text-xl font-black italic tracking-[-0.045em]">
            {APP_NAME}
          </span>
        </Link>
        <nav
          className="hidden items-center gap-8 text-sm text-muted-foreground md:flex"
          aria-label="Основная навигация"
        >
          <a
            className="transition-colors hover:text-foreground"
            href="#process"
          >
            Как это работает
          </a>
          <a className="transition-colors hover:text-foreground" href="#modes">
            Возможности
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
            marketingCtaClassName("h-10 rounded-full px-5"),
            "sm",
          )}
        >
          Создать интерьер
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
