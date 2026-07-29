"use client";

import {
  ArrowRight,
  Download,
  GitBranch,
  ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type HistoryItem = {
  id: string;
  projectId: string;
  parentGenerationId: string | null;
  status: string;
  prompt: string;
  aspectRatio: string;
  resultUserId: string | null;
  resultUrl: string | null;
  queuedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  project: { name: string };
  _count: { references: number };
};

const FILTERS = [
  ["", "Все"],
  ["SUCCEEDED", "Готовые"],
  ["PROCESSING", "В работе"],
  ["FAILED", "Ошибки"],
] as const;

const STATUS_COPY: Record<
  string,
  { label: string; variant: "secondary" | "success" | "warning" | "outline" }
> = {
  SUCCEEDED: { label: "Готово", variant: "success" },
  PROCESSING: { label: "Создаём", variant: "warning" },
  QUEUED: { label: "В очереди", variant: "warning" },
  FAILED: { label: "Ошибка", variant: "outline" },
  REJECTED: { label: "Отклонено", variant: "outline" },
  CANCELLED: { label: "Отменено", variant: "secondary" },
};

async function apiData(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Запрос не выполнен");
  }
  return payload.data;
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
      return (await apiData(
        await fetch(`/api/v1/generations?${params}`),
      )) as Promise<{ items: HistoryItem[]; nextCursor: string | null }>;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const remove = useMutation({
    mutationFn: async (id: string) =>
      apiData(
        await fetch(`/api/v1/generations/${id}`, { method: "DELETE" }),
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["history"] }),
  });
  const items = history.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Фильтр истории">
          {FILTERS.map(([value, label]) => (
            <Button
              key={value}
              variant={status === value ? "default" : "secondary"}
              size="sm"
              onClick={() => setStatus(value)}
              role="tab"
              aria-selected={status === value}
            >
              {label}
            </Button>
          ))}
        </div>
        <Link href="/app" className={buttonClassName("default", undefined, "sm")}>
          <Plus className="size-4" />
          Новый интерьер
        </Link>
      </div>

      {history.isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="aspect-[4/3] min-h-72" />
          ))}
        </div>
      ) : null}

      {history.error ? (
        <Card className="mt-6 border-destructive/30">
          <CardContent className="p-5 text-sm text-destructive">
            {history.error.message}
          </CardContent>
        </Card>
      ) : null}

      {!history.isLoading && items.length === 0 ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
                <ImageIcon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">История пока пуста</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Загрузите комнату и создайте первый вариант — он появится здесь
                вместе со всеми следующими итерациями.
              </p>
              <Link
                href="/app"
                className={buttonClassName("default", "mt-5")}
              >
                Создать интерьер
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const statusCopy = STATUS_COPY[item.status] ?? {
            label: item.status,
            variant: "secondary" as const,
          };
          return (
            <Card
              key={item.id}
              className="group overflow-hidden transition-colors hover:border-muted-foreground/35"
            >
              <div className="relative">
                {item.resultUrl ? (
                  <div className="aspect-[4/3] overflow-hidden bg-black">
                    {/* Private signed URL is short lived and cannot use a stable Next Image loader. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.resultUrl}
                      alt={item.project.name}
                      className="size-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid aspect-[4/3] place-items-center bg-secondary">
                    <ImageIcon className="size-7 text-muted-foreground" aria-hidden="true" />
                  </div>
                )}
                <Badge
                  variant={statusCopy.variant}
                  className="absolute left-3 top-3 shadow-lg shadow-black/20"
                >
                  {statusCopy.label}
                </Badge>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{item.project.name}</h2>
                    <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                      <GitBranch className="size-3" aria-hidden="true" />
                      {item.parentGenerationId ? "Итерация" : "Основной вариант"}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {new Date(item.queuedAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                  {item.prompt}
                </p>
                <div className="mt-3 flex gap-2 font-mono text-[10px] text-muted-foreground">
                  <span>{item.aspectRatio.replace("RATIO_", "").replace("_", ":")}</span>
                  <span>·</span>
                  <span>{item._count.references} реф.</span>
                </div>
                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  <Link
                    href={`/app/${item.projectId}`}
                    className={buttonClassName("secondary", "flex-1", "sm")}
                  >
                    Открыть
                    <ArrowRight className="size-4" />
                  </Link>
                  {item.status === "SUCCEEDED" ? (
                    <a
                      href={`/api/v1/generations/${item.id}/download`}
                      className={buttonClassName("ghost", undefined, "icon")}
                      aria-label="Скачать JPG"
                    >
                      <Download className="size-4" />
                    </a>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove.mutate(item.id)}
                      disabled={
                        remove.isPending ||
                        ["QUEUED", "PROCESSING"].includes(item.status)
                      }
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Удалить генерацию"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {history.hasNextPage ? (
        <Button
          variant="secondary"
          onClick={() => history.fetchNextPage()}
          disabled={history.isFetchingNextPage}
          className="mt-6 w-full"
        >
          {history.isFetchingNextPage ? "Загружаем…" : "Показать ещё"}
        </Button>
      ) : null}
    </div>
  );
}
