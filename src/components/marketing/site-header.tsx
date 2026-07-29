import Link from "next/link";
import { ScanLine } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { APP_NAME } from "@/config/brand";
import { authEntry } from "@/lib/auth/route-policy";

export function SiteHeader({ authenticated }: { authenticated: boolean }) {
  const entry = authEntry(authenticated);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${APP_NAME} — главная`}>
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ScanLine className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="text-sm font-black uppercase tracking-[0.12em]">{APP_NAME}</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex" aria-label="Основная навигация">
          <a className="transition-colors hover:text-foreground" href="#process">Как это работает</a>
          <a className="transition-colors hover:text-foreground" href="#examples">Примеры</a>
          <a className="transition-colors hover:text-foreground" href="#pricing">Тарифы</a>
        </nav>
        <Link href={entry.href} className={buttonClassName("default", undefined, "sm")}>{entry.label}</Link>
      </div>
    </header>
  );
}
