import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  return (
    <main className="min-h-screen bg-background p-3 text-foreground sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-[1500px] gap-3 lg:grid-cols-[240px_1fr]">
        <aside className="hidden rounded-[var(--radius-lg)] border border-border bg-surface p-5 lg:flex lg:flex-col">
          <Link href="/" className="text-lg font-black italic">AI Interior Designer</Link>
          <nav className="mt-10 space-y-2 text-sm">
            <Link href="/app/design" className="block rounded-xl bg-surface-elevated px-4 py-3 font-bold text-accent">＋ Новый дизайн</Link>
            <span className="block rounded-xl px-4 py-3 text-muted">Проекты</span>
            <span className="block rounded-xl px-4 py-3 text-muted">История</span>
          </nav>
          <div className="mt-auto border-t border-border pt-5 text-sm text-muted"><b className="text-foreground">Обычный тариф</b><br />Лимиты появятся после создания профиля.</div>
        </aside>
        <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 sm:p-7">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div><p className="text-xs font-black tracking-[0.18em] text-accent uppercase">Рабочая область</p><h1 className="mt-2 text-3xl font-black italic sm:text-4xl">Новый интерьер</h1></div>
            <span className="rounded-full border border-border px-4 py-2 text-xs text-muted">Сессия Google активна</span>
          </header>
          <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_330px]">
            <Link href="/app/design" className="grid min-h-[430px] place-items-center rounded-2xl border border-dashed border-border bg-background p-6 text-center transition-colors hover:border-accent/50">
              <div><div className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-2xl text-accent-foreground">＋</div><h2 className="mt-5 text-xl font-bold">Загрузите фотографию комнаты</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted">JPG, PNG или WEBP. Файл будет проверен и сохранён в приватном Storage.</p></div>
            </Link>
            <aside className="rounded-2xl border border-border bg-background p-5">
              <p className="font-bold">Процесс</p>
              {['Фото помещения', 'Референсы', 'Инструкция'].map((label, index) => <div key={label} className="mt-4 flex items-center gap-3 text-sm text-muted"><span className="grid size-7 place-items-center rounded-full bg-surface-elevated font-mono text-xs">{index + 1}</span>{label}</div>)}
              <Link href="#" aria-disabled="true" className={buttonClassName("primary", "mt-8 w-full pointer-events-none opacity-60")}>Визуализировать →</Link>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
