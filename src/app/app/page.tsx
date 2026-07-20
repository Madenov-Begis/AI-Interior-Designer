import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { requireCurrentUser, UnauthorizedError, upsertProfileFromAuthUser } from "@/lib/auth/current-user";
import { listProjects } from "@/features/projects/service";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AppDashboardPage() {
  let user;
  try { user = await requireCurrentUser(); } catch (error) { if (error instanceof UnauthorizedError) redirect("/login"); throw error; }
  await upsertProfileFromAuthUser(user);
  const { items: projects } = await listProjects(user.id, 6);
  const now = new Date();
  const notification = await getDb().notification.findFirst({ where: { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, orderBy: { createdAt: "desc" } });

  return (
    <main className="min-h-screen bg-background p-3 text-foreground sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-[1500px] gap-3 lg:grid-cols-[240px_1fr]">
        <aside className="hidden rounded-[var(--radius-lg)] border border-border bg-surface p-5 lg:flex lg:flex-col">
          <Link href="/" className="text-lg font-black italic">AI Interior Designer</Link>
          <nav className="mt-10 space-y-2 text-sm">
            <Link href="/app/design" className="block rounded-xl bg-surface-elevated px-4 py-3 font-bold text-accent">＋ Новый дизайн</Link>
            <span className="block rounded-xl px-4 py-3 text-muted">Проекты</span>
            <Link href="/app/history" className="block rounded-xl px-4 py-3 text-muted hover:bg-surface-elevated hover:text-foreground">История</Link>
            <Link href="/app/profile" className="block rounded-xl px-4 py-3 text-muted hover:bg-surface-elevated hover:text-foreground">Профиль</Link>
          </nav>
          <div className="mt-auto border-t border-border pt-5 text-sm text-muted"><b className="text-foreground">Обычный тариф</b><br />Лимиты появятся после создания профиля.</div>
        </aside>
        <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 sm:p-7">
          {notification && <div className="mb-5 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm"><b>{notification.title ?? "Уведомление"}</b><span className="ml-2 text-muted">{notification.content}</span>{notification.linkUrl && <a href={notification.linkUrl} className="ml-2 font-bold text-accent" rel="noreferrer">Подробнее →</a>}</div>}
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
          {projects.length > 0 && <section className="mt-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[0.18em] text-accent uppercase">Проекты</p><h2 className="mt-2 text-2xl font-black italic">Продолжить работу</h2></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <Link key={project.id} href={`/app/design/${project.id}`} className="rounded-2xl border border-border bg-background p-5 transition-colors hover:border-accent/50"><div className="flex items-start justify-between gap-3"><h3 className="font-black">{project.name}</h3><span className="rounded-full bg-surface-elevated px-2 py-1 text-[10px] text-muted">{project.status}</span></div><p className="mt-6 text-xs text-muted">Обновлён {project.updatedAt.toLocaleDateString("ru-RU")}</p></Link>)}</div></section>}
        </section>
      </div>
    </main>
  );
}
