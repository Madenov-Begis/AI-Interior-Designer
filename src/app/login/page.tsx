import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export const metadata = {
  title: "Вход — AI Interior Designer",
};

export default function LoginPage() {
  return (
    <main className="page-grid hero-glow flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-2xl shadow-black/35 sm:p-9">
        <Link href="/" className="text-lg font-black tracking-tight italic">AI Interior Designer</Link>
        <p className="mt-10 text-xs font-black tracking-[0.2em] text-accent uppercase">Личный кабинет</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] italic">Войдите, чтобы начать дизайн</h1>
        <p className="mt-4 leading-7 text-muted">Загружайте фотографии, сохраняйте проекты и возвращайтесь к истории генераций.</p>
        <Link
          href="/api/v1/auth/google"
          className={buttonClassName("secondary", "mt-8 w-full justify-center rounded-xl")}
        >
          <span className="grid size-7 place-items-center rounded-full bg-foreground font-bold text-background">G</span>
          Продолжить с Google
        </Link>
        <p className="mt-3 text-center text-xs text-muted">Мы используем Google только для безопасного входа.</p>
        <Link href="/" className="mt-8 block text-center text-sm text-muted transition-colors hover:text-foreground">← Вернуться на главную</Link>
      </section>
    </main>
  );
}
