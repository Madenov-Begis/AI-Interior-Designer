import { Sparkle } from "lucide-react";
import Link from "next/link";
import { APP_NAME } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="bg-[#111113]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <Link href="/" className="flex items-center gap-2.5">
          <Sparkle className="size-5 fill-primary text-primary" aria-hidden="true" />
          <span className="text-xl font-black italic tracking-[-0.045em]">
            {APP_NAME}
          </span>
        </Link>
        <nav className="grid content-start gap-3 text-sm text-muted-foreground" aria-label="Ссылки в подвале">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-foreground">Продукт</p>
          <a href="#process" className="hover:text-foreground">Как это работает</a>
          <a href="#examples" className="hover:text-foreground">Примеры</a>
          <Link href="/login" className="hover:text-foreground">Войти</Link>
        </nav>
        <div className="grid content-start gap-3 text-sm text-muted-foreground">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-foreground">Документы</p>
          <span>Конфиденциальность</span>
          <span>Условия использования</span>
          <span>Поддержка</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 border-t border-border px-5 py-6 text-xs text-muted-foreground sm:px-8 md:flex-row md:items-center md:justify-between">
        <p>© 2026 {APP_NAME}</p>
        <p>AI-дизайн интерьера на одном холсте</p>
      </div>
    </footer>
  );
}
