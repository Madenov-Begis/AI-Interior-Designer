import Link from "next/link";
import { APP_NAME } from "@/shared/config";
import { RuvieLogo } from "@/shared/ui";
import { LEGAL_ROUTES } from "@config/legal";

export function SiteFooter() {
  return (
    <footer className="bg-[#111113]">
      <div className="landing-shell grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <RuvieLogo href="/" />
        <nav
          className="grid content-start gap-3 text-sm text-muted-foreground"
          aria-label="Ссылки в подвале"
        >
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-foreground">
            Продукт
          </p>
          <a href="#process" className="hover:text-foreground">
            Как это работает
          </a>
          <a href="#examples" className="hover:text-foreground">
            Примеры
          </a>
          <Link href="/login" className="hover:text-foreground">
            Войти
          </Link>
        </nav>
        <div className="grid content-start gap-3 text-sm text-muted-foreground">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-foreground">
            Документы
          </p>
          <Link href={LEGAL_ROUTES.privacy} className="hover:text-foreground">
            Политика конфиденциальности
          </Link>
          <Link href={LEGAL_ROUTES.offer} className="hover:text-foreground">
            Публичная оферта
          </Link>
          <a href="mailto:support@ruvie.cc" className="hover:text-foreground">
            support@ruvie.cc
          </a>
        </div>
      </div>
      <div className="landing-shell flex flex-col gap-3 border-t border-border py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>© 2026 {APP_NAME}</p>
        <p>AI-дизайн интерьера на одном холсте</p>
      </div>
    </footer>
  );
}
