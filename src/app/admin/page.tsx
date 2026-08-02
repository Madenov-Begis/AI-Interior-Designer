"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ApiClientError, apiData } from "@/lib/api/client";

type AdminOverview = {
  counts: {
    users: number;
    projects: number;
    generations: number;
    failed: number;
  };
  users: Array<{
    id: string;
    account: string;
    role: string;
    plan: string;
    status: string;
  }>;
  generations: Array<{
    id: string;
    account: string;
    status: string;
    createdAt: string;
  }>;
  plans: Array<{
    id: string;
    code: string;
    name: string;
    users: number;
  }>;
};

export default function AdminPage() {
  const router = useRouter();
  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: ({ signal }) =>
      apiData<AdminOverview>({
        url: "/admin/overview",
        method: "GET",
        signal,
      }),
    retry: false,
  });

  useEffect(() => {
    if (
      overview.error instanceof ApiClientError &&
      overview.error.status === 403
    ) {
      router.replace("/app");
    }
  }, [overview.error, router]);

  const cards = overview.data
    ? ([
        ["Пользователи", overview.data.counts.users],
        ["Проекты", overview.data.counts.projects],
        ["Все генерации", overview.data.counts.generations],
        ["Ошибки генераций", overview.data.counts.failed],
      ] as const)
    : [];

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

        {overview.isLoading ? (
          <p className="mt-8 text-sm text-muted">Загружаем данные…</p>
        ) : null}
        {overview.isError ? (
          <div className="mt-8 rounded-2xl border border-destructive/30 bg-surface p-5">
            <p className="text-sm text-destructive" role="alert">
              {overview.error.message}
            </p>
            <Button className="mt-4" onClick={() => overview.refetch()}>
              Повторить
            </Button>
          </div>
        ) : null}

        {overview.data ? (
          <>
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
                rows={overview.data.users.map((user) => [
                  user.account,
                  user.role,
                  user.plan,
                  user.status,
                ])}
              />
              <AdminTable
                title="Последние генерации"
                headers={["Пользователь", "Статус", "Создана"]}
                rows={overview.data.generations.map((item) => [
                  item.account,
                  item.status,
                  new Date(item.createdAt).toLocaleString("ru-RU"),
                ])}
              />
              <AdminTable
                title="Тарифы"
                headers={["Код", "Название", "Пользователи"]}
                rows={overview.data.plans.map((plan) => [
                  plan.code,
                  plan.name,
                  String(plan.users),
                ])}
              />
            </div>
            <p className="mt-6 text-sm text-muted">
              Изменения доступны через защищённые API{" "}
              <code>/api/v1/admin/*</code>.
            </p>
          </>
        ) : null}
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
