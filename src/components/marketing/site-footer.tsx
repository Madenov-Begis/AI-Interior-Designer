import { ScanLine } from "lucide-react";
import Link from "next/link";
import { APP_NAME } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer>
      <div className="mx-auto flex max-w-[1480px] flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ScanLine className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="text-sm font-black uppercase tracking-[0.12em]">
            {APP_NAME}
          </span>
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground" aria-label="Ссылки в подвале">
          <a href="#process" className="hover:text-foreground">Как это работает</a>
          <a href="#examples" className="hover:text-foreground">Примеры</a>
          <Link href="/login" className="hover:text-foreground">Войти</Link>
        </nav>
        <p className="font-mono text-[10px] text-muted-foreground">
          © 2026 {APP_NAME}
        </p>
      </div>
    </footer>
  );
}
