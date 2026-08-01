import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin, ForbiddenError } from "@/lib/auth/admin";
import { UnauthorizedError } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login?next=/admin");
    if (error instanceof ForbiddenError) redirect("/app");
    throw error;
  }
  const [
    usersCount,
    projectsCount,
    generationsCount,
    failedCount,
    users,
    generations,
    plans,
  ] = await Promise.all([
    getDb().profile.count({ where: { deletedAt: null } }),
    getDb().project.count({ where: { deletedAt: null } }),
    getDb().generation.count({ where: { deletedAt: null } }),
    getDb().generation.count({ where: { status: "FAILED", deletedAt: null } }),
    getDb().profile.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { plan: true },
    }),
    getDb().generation.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { email: true, phone: true } } },
    }),
    getDb().plan.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { users: true } } },
    }),
  ]);
  const cards = [
    ["Пользователи", usersCount],
    ["Проекты", projectsCount],
    ["Все генерации", generationsCount],
    ["Ошибки генераций", failedCount],
  ] as const;
  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-7">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-accent uppercase">
              Управление системой
            </p>
            <h1 className="mt-2 text-4xl font-black italic">Админ-панель</h1>
          </div>
          <Link
            href="/app"
            className="rounded-xl border border-border px-4 py-2 text-sm"
          >
            ← В приложение
          </Link>
        </header>
        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value]) => (
            <article
              key={label}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-3 text-3xl font-black">{value}</p>
            </article>
          ))}
        </section>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <AdminTable
            title="Пользователи"
            headers={["Аккаунт", "Роль", "Тариф", "Статус"]}
            rows={users.map((user) => [
              user.displayName || user.email || user.phone || "—",
              user.role,
              user.plan?.name ?? "—",
              user.status,
            ])}
          />
          <AdminTable
            title="Последние генерации"
            headers={["Пользователь", "Статус", "Создана"]}
            rows={generations.map((item) => [
              item.user.email ?? item.user.phone ?? "—",
              item.status,
              item.createdAt.toLocaleString("ru-RU"),
            ])}
          />
          <AdminTable
            title="Тарифы"
            headers={["Код", "Название", "Пользователи", "Лимит/день"]}
            rows={plans.map((plan) => [
              plan.code,
              plan.name,
              String(plan._count.users),
              plan.dailyGenerationLimit?.toString() ?? "∞",
            ])}
          />
        </div>
        <p className="mt-6 text-sm text-muted">
          Изменения доступны через защищённые API <code>/api/v1/admin/*</code>.
        </p>
      </div>
    </main>
  );
}

function AdminTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <h2 className="p-5 text-xl font-black italic">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-surface-elevated text-xs text-muted">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-bold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr
                  key={`${title}-${index}`}
                  className="border-t border-border"
                >
                  {row.map((cell, cellIndex) => (
                    <td key={`${index}-${cellIndex}`} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-8 text-center text-muted"
                >
                  Пока пусто
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
