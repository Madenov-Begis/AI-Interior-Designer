"use client";

import {
  Copy,
  FolderOpen,
  Grid2X2,
  ImageIcon,
  List,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type ProjectItem = {
  id: string;
  name: string;
  status: string;
  aspectRatio: string;
  createdAt: string;
  updatedAt: string;
  previewUrl: string | null;
  previewWidth: number | null;
  previewHeight: number | null;
  generationCount: number;
};

type ProjectsPayload = {
  items: ProjectItem[];
  nextCursor: string | null;
};

async function apiData<T>(response: Response | Promise<Response>): Promise<T> {
  const resolved = await response;
  const payload = await resolved.json();
  if (!resolved.ok) {
    throw new Error(payload.error?.message ?? "Запрос не выполнен");
  }
  return payload.data as T;
}

export function ProjectsGrid() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () =>
      apiData<ProjectsPayload>(
        fetch("/api/v1/projects?limit=40", { cache: "no-store" }),
      ),
  });
  const createProject = useMutation({
    mutationFn: () =>
      apiData<ProjectItem>(
        fetch("/api/v1/projects", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Новый интерьер" }),
        }),
      ),
    onSuccess: (project) => router.push(`/app/${project.id}`),
  });
  const duplicateProject = useMutation({
    mutationFn: (id: string) =>
      apiData<ProjectItem>(
        fetch(`/api/v1/projects/${id}/duplicate`, { method: "POST" }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
  const removeProject = useMutation({
    mutationFn: (id: string) =>
      apiData<{ deleted: true }>(
        fetch(`/api/v1/projects/${id}`, { method: "DELETE" }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    if (!query) return projects.data?.items ?? [];
    return (projects.data?.items ?? []).filter((project) =>
      project.name.toLocaleLowerCase("ru").includes(query),
    );
  }, [projects.data?.items, search]);

  return (
    <div className="grid min-h-[calc(100dvh-72px)] lg:grid-cols-[292px_minmax(0,1fr)]">
      <aside className="border-r border-border bg-card/75 p-5">
        <Button
          size="lg"
          variant="secondary"
          className="w-full justify-start"
          onClick={() => createProject.mutate()}
          disabled={createProject.isPending}
        >
          <Plus className="size-5" />
          {createProject.isPending ? "Создаём…" : "Создать проект"}
        </Button>
        <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Папки
        </p>
        <div className="mt-3 flex min-h-12 items-center gap-3 rounded-xl bg-secondary px-4 text-sm font-bold">
          <FolderOpen className="size-5" />
          Все проекты
          <span className="ml-auto text-muted-foreground">
            {projects.data?.items.length ?? 0}
          </span>
        </div>
        <button
          type="button"
          className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Plus className="size-4" />
          Новая папка
        </button>
      </aside>

      <section className="min-w-0">
        <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по названию проекта"
              className="h-12 rounded-xl bg-card pl-12"
            />
          </label>
          <Button variant="secondary" size="lg">
            <SlidersHorizontal className="size-4" />
            Категория
          </Button>
          <div className="flex h-12 items-center rounded-xl border border-border bg-card p-1">
            <button
              type="button"
              className={`grid size-10 place-items-center rounded-lg ${
                view === "list"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground"
              }`}
              onClick={() => setView("list")}
              aria-label="Показать списком"
            >
              <List className="size-5" />
            </button>
            <button
              type="button"
              className={`grid size-10 place-items-center rounded-lg ${
                view === "grid"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground"
              }`}
              onClick={() => setView("grid")}
              aria-label="Показать сеткой"
            >
              <Grid2X2 className="size-5" />
            </button>
          </div>
        </div>

        <div className="p-5">
          {projects.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="aspect-[4/5] rounded-[18px]" />
              ))}
            </div>
          ) : null}

          {projects.error ? (
            <div className="rounded-[18px] border border-destructive/30 bg-card p-5 text-sm text-destructive">
              {projects.error.message}
            </div>
          ) : null}

          {!projects.isLoading && filteredProjects.length === 0 ? (
            <button
              type="button"
              onClick={() => createProject.mutate()}
              className="grid min-h-80 w-full place-items-center rounded-[24px] border border-dashed border-border bg-card/65 p-8 text-center transition-colors hover:border-primary"
            >
              <span>
                <Plus className="mx-auto size-9 text-primary" />
                <b className="mt-4 block text-lg">Создать первый проект</b>
                <span className="mt-2 block text-sm text-muted-foreground">
                  Фото комнаты прикрепляется сразу на холсте
                </span>
              </span>
            </button>
          ) : null}

          <div
            className={
              view === "grid"
                ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                : "grid gap-3"
            }
          >
            {filteredProjects.map((project) => (
              <article
                key={project.id}
                className={`group overflow-hidden rounded-[18px] border border-border bg-card transition-colors hover:border-muted-foreground/45 ${
                  view === "list" ? "flex min-h-28" : ""
                }`}
              >
                <Link
                  href={`/app/${project.id}`}
                  prefetch={false}
                  className={
                    view === "list"
                      ? "relative block w-40 shrink-0 overflow-hidden bg-secondary"
                      : "relative block aspect-[4/5] overflow-hidden bg-secondary"
                  }
                >
                  {project.previewUrl ? (
                    // Signed project media cannot use a stable Next image loader.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.previewUrl}
                      alt={project.name}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                    />
                  ) : (
                    <span className="grid size-full place-items-center">
                      <ImageIcon className="size-8 text-muted-foreground" />
                    </span>
                  )}
                  <span className="absolute bottom-3 left-3 rounded-md bg-black/70 px-2 py-1 text-[11px] font-bold backdrop-blur">
                    {project.generationCount} результатов
                  </span>
                </Link>
                <div className="flex min-w-0 flex-1 items-start gap-3 p-4">
                  <Link
                    href={`/app/${project.id}`}
                    prefetch={false}
                    className="min-w-0 flex-1"
                  >
                    <h2 className="truncate text-sm font-bold">
                      {project.name}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(project.updatedAt).toLocaleDateString("ru-RU")}
                    </p>
                  </Link>
                  <details className="relative">
                    <summary className="grid size-8 cursor-pointer list-none place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <MoreHorizontal className="size-5" />
                      <span className="sr-only">Действия с проектом</span>
                    </summary>
                    <div className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-border bg-popover p-1.5 shadow-2xl">
                      <button
                        type="button"
                        className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-secondary"
                        onClick={() => duplicateProject.mutate(project.id)}
                      >
                        <Copy className="size-4" />
                        Дублировать
                      </button>
                      <button
                        type="button"
                        className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm text-destructive hover:bg-secondary"
                        onClick={() => removeProject.mutate(project.id)}
                      >
                        <Trash2 className="size-4" />
                        Удалить
                      </button>
                    </div>
                  </details>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
