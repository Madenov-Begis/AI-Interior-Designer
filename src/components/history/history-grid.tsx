"use client";

import Link from "next/link";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { buttonClassName } from "@/components/ui/button";

type HistoryItem = {
  id: string; projectId: string; status: string; prompt: string; aspectRatio: string; resultUserId: string | null;
  queuedAt: string; completedAt: string | null; durationMs: number | null; project: { name: string }; _count: { references: number };
};

async function apiData(response: Response) {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Запрос не выполнен");
  return payload.data;
}

function HistoryImage({ fileId, alt }: { fileId: string; alt: string }) {
  const query = useQuery({ queryKey: ["history-image", fileId], queryFn: async () => apiData(await fetch(`/api/v1/media/${fileId}/signed-url`)) as Promise<{ url: string }> });
  if (!query.data?.url) return <div className="grid aspect-[4/3] place-items-center bg-surface-elevated text-sm text-muted">Загружаем результат…</div>;
  return <div className="aspect-[4/3] overflow-hidden bg-black">
    {/* Private signed URL is short lived and cannot use a stable Next Image loader. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={query.data.url} alt={alt} className="size-full object-cover" />
  </div>;
}

export function HistoryGrid() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const history = useInfiniteQuery({
    queryKey: ["history", status],
    initialPageParam: "",
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "20" });
      if (pageParam) params.set("cursor", pageParam);
      if (status) params.set("status", status);
      return apiData(await fetch(`/api/v1/generations?${params}`)) as Promise<{ items: HistoryItem[]; nextCursor: string | null }>;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => apiData(await fetch(`/api/v1/generations/${id}`, { method: "DELETE" })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history"] }),
  });
  const items = history.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {[['', 'Все'], ['SUCCEEDED', 'Готовые'], ['PROCESSING', 'В работе'], ['FAILED', 'Ошибки']].map(([value, label]) => <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${status === value ? "bg-accent text-accent-foreground" : "bg-surface-elevated text-muted"}`}>{label}</button>)}
      </div>
      {history.isLoading && <p className="mt-8 text-muted">Загружаем историю…</p>}
      {history.error && <p className="mt-8 text-red-300">{history.error.message}</p>}
      {!history.isLoading && items.length === 0 && <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center"><h2 className="text-xl font-bold">История пока пуста</h2><Link href="/app" className={buttonClassName("primary", "mt-5 rounded-xl")}>Создать дизайн</Link></div>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-2xl border border-border bg-background">
            {item.resultUserId ? <HistoryImage fileId={item.resultUserId} alt={item.project.name} /> : <div className="grid aspect-[4/3] place-items-center bg-surface-elevated text-sm font-bold text-muted">{item.status}</div>}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3"><h2 className="font-black">{item.project.name}</h2><span className="rounded-full bg-surface-elevated px-2 py-1 text-[10px] font-bold">{item.status}</span></div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{item.prompt}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted"><span>{item._count.references} реф.</span><span>·</span><span>{new Date(item.queuedAt).toLocaleDateString("ru-RU")}</span></div>
              <div className="mt-4 grid grid-cols-2 gap-2"><Link href={`/app/${item.projectId}`} className={buttonClassName("secondary", "rounded-lg text-center")}>Открыть</Link>{item.status === "SUCCEEDED" ? <a href={`/api/v1/generations/${item.id}/download`} className={buttonClassName("secondary", "rounded-lg text-center")}>Скачать</a> : <button type="button" onClick={() => remove.mutate(item.id)} disabled={remove.isPending || ["QUEUED", "PROCESSING"].includes(item.status)} className={buttonClassName("secondary", "rounded-lg text-red-300 disabled:opacity-30")}>Удалить</button>}</div>
            </div>
          </article>
        ))}
      </div>
      {history.hasNextPage && <button type="button" onClick={() => history.fetchNextPage()} disabled={history.isFetchingNextPage} className={buttonClassName("secondary", "mt-6 w-full rounded-xl")}>{history.isFetchingNextPage ? "Загружаем…" : "Показать ещё"}</button>}
    </div>
  );
}
