import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { authEntry } from "@/lib/auth/route-policy";

export function SiteHeader({ authenticated }: { authenticated: boolean }) {
  const entry = authEntry(authenticated);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-black tracking-tight italic" aria-label="AI Interior Designer — главная">
          AI Interior Designer
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex" aria-label="Основная навигация">
          <a className="transition-colors hover:text-foreground" href="#process">Как это работает</a>
          <a className="transition-colors hover:text-foreground" href="#examples">Примеры</a>
          <a className="transition-colors hover:text-foreground" href="#pricing">Тарифы</a>
        </nav>
        <Link href={entry.href} className={buttonClassName("primary", "min-h-10 px-5 py-2")}>{entry.label}</Link>
      </div>
    </header>
  );
}
