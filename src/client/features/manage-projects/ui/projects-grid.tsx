"use client";

import {
  Grid2X2,
  ImageIcon,
  Lightbulb,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  AppPagination,
} from "@/shared/ui";
import { Button, LoadingButton, LoadingRegion } from "@/shared/ui";
import { Card, CardContent } from "@/shared/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/shared/ui";
import { Skeleton } from "@/shared/ui";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui";
import { apiData } from "@/shared/api";
import { DEFAULT_PROJECT_NAME } from "../model/naming.ts";
import { cn } from "@/shared/lib";

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
  page: number;
  pageCount: number;
  total: number;
};

const PROJECTS_PER_PAGE = 20;

function projectsListHref(page: number, search: string) {
  const params = new URLSearchParams();
  const normalizedSearch = search.trim();
  if (normalizedSearch) params.set("search", normalizedSearch);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/app/projects?${query}` : "/app/projects";
}

export function ProjectsGrid({
  page,
  initialSearch,
}: {
  page: number;
  initialSearch: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(initialSearch);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [projectPendingDeletion, setProjectPendingDeletion] =
    useState<ProjectItem | null>(null);
  const buildPageHref = useCallback(
    (nextPage: number) => projectsListHref(nextPage, initialSearch),
    [initialSearch],
  );

  useEffect(() => {
    const normalizedSearch = search.trim();
    if (normalizedSearch === initialSearch) return;

    const timeout = window.setTimeout(() => {
      router.replace(projectsListHref(1, normalizedSearch), { scroll: false });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [initialSearch, router, search]);

  const projects = useQuery({
    queryKey: [
      "projects",
      { page, limit: PROJECTS_PER_PAGE, search: initialSearch },
    ],
    queryFn: () =>
      apiData<ProjectsPayload>({
        url: "/projects",
        method: "GET",
        params: {
          limit: PROJECTS_PER_PAGE,
          page,
          search: initialSearch || undefined,
        },
      }),
    placeholderData: keepPreviousData,
  });
  const createProject = useMutation({
    mutationFn: () =>
      apiData<ProjectItem>({
        url: "/projects",
        method: "POST",
        data: { name: DEFAULT_PROJECT_NAME },
      }),
    onSuccess: (project) => router.push(`/app/${project.id}`),
  });
  const removeProject = useMutation({
    mutationFn: (id: string) =>
      apiData<{ deleted: true }>({
        url: `/projects/${id}`,
        method: "DELETE",
      }),
    onSuccess: () => {
      setProjectPendingDeletion(null);
      if (page > 1 && projects.data?.items.length === 1) {
        router.replace(buildPageHref(page - 1));
      }
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const loadedProjects = projects.data?.items ?? [];
  const hasProjects = (projects.data?.total ?? 0) > 0;
  const hasActiveSearch = Boolean(initialSearch);

  return (
    <div className="grid min-h-[calc(100dvh-72px)] lg:grid-cols-[292px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-card/75 p-5 lg:block">
        <LoadingButton
          size="lg"
          variant="secondary"
          className="w-full justify-start"
          onClick={() => createProject.mutate()}
          pending={createProject.isPending}
          pendingText="Создаём…"
        >
          <Plus className="size-5" />
          Создать проект
        </LoadingButton>
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Быстрый старт
          </p>
          <ol className="mt-4 space-y-4">
            {[
              ["1", "Создайте проект"],
              ["2", "Загрузите фото комнаты"],
              ["3", "Выберите стиль и создайте дизайн"],
            ].map(([number, label]) => (
              <li key={number} className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-foreground">
                  {number}
                </span>
                <span className="pt-1 text-sm leading-5 text-muted-foreground">
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-background/45 p-4">
          <Lightbulb className="text-primary" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold">Для лучшего результата</p>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            Используйте светлое фото, где комната полностью видна в кадре.
          </p>
        </div>
      </aside>

      <section className="min-w-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-5 md:flex-row md:items-center">
          <div className="flex gap-3 lg:contents">
            <LoadingButton
              size="icon-lg"
              variant="secondary"
              className="shrink-0 lg:hidden"
              onClick={() => createProject.mutate()}
              pending={createProject.isPending}
              aria-label="Создать проект"
            >
              <Plus />
            </LoadingButton>
            <InputGroup className="h-12 min-w-0 flex-1 bg-card has-[[data-slot=input-group-control]:focus-visible]:border-primary/70 has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-primary/20">
              <InputGroupAddon align="inline-start">
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск среди загруженных проектов"
                aria-label="Поиск среди загруженных проектов"
              />
              {search ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-sm"
                    aria-label="Очистить поиск"
                    onClick={() => {
                      setSearch("");
                      router.replace(projectsListHref(1, ""), {
                        scroll: false,
                      });
                    }}
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
          </div>
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(value) => {
              if (value === "grid" || value === "list") setView(value);
            }}
            variant="outline"
            size="lg"
            aria-label="Вид списка проектов"
          >
            <ToggleGroupItem value="list" aria-label="Показать списком">
              <List />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Показать сеткой">
              <Grid2X2 />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="p-5">
          {createProject.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Не удалось создать проект</AlertTitle>
              <AlertDescription>{createProject.error.message}</AlertDescription>
            </Alert>
          ) : null}
          {projects.isLoading ? (
            <LoadingRegion
              label="Загружаем проекты…"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="aspect-[4/5] rounded-[18px]" />
              ))}
            </LoadingRegion>
          ) : null}

          {projects.error ? (
            <Alert variant="destructive">
              <AlertTitle>Не удалось загрузить проекты</AlertTitle>
              <AlertDescription>
                <p>{projects.error.message}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void projects.refetch()}
                >
                  Повторить
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {!projects.isLoading &&
          !projects.error &&
          loadedProjects.length === 0 ? (
            <Empty className="min-h-80 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {hasActiveSearch ? <Search /> : <Plus />}
                </EmptyMedia>
                <EmptyTitle>
                  {hasActiveSearch
                    ? "Проекты не найдены"
                    : hasProjects
                      ? "На этой странице нет проектов"
                      : "Создать первый проект"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasActiveSearch
                    ? "Измените поисковый запрос"
                    : page > 1
                      ? "Перейдите на другую страницу списка"
                      : "Фото комнаты прикрепляется сразу на холсте"}
                </EmptyDescription>
              </EmptyHeader>
              {!hasActiveSearch && !hasProjects ? (
                <EmptyContent>
                  <LoadingButton
                    onClick={() => createProject.mutate()}
                    pending={createProject.isPending}
                    pendingText="Создаём…"
                  >
                    <Plus data-icon="inline-start" />
                    Создать проект
                  </LoadingButton>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : null}

          <p
            className="mb-3 min-h-5 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {projects.isFetching && !projects.isLoading
              ? "Обновляем список проектов…"
              : null}
          </p>
          <div
            className={cn(
              "grid",
              view === "grid" ? "gap-4 sm:grid-cols-2 xl:grid-cols-4" : "gap-3",
            )}
            aria-busy={projects.isFetching}
          >
            {loadedProjects.map((project) => (
              <Card
                key={project.id}
                className={cn(
                  "group overflow-hidden transition-colors hover:border-muted-foreground/45",
                  view === "list" && "flex min-h-28 flex-row",
                )}
              >
                <Link
                  href={`/app/${project.id}`}
                  prefetch={false}
                  className={cn(
                    "relative block overflow-hidden bg-secondary",
                    view === "list" ? "w-40 shrink-0" : "aspect-[4/5]",
                  )}
                >
                  {project.previewUrl ? (
                    // Signed project media cannot use a stable Next image loader.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.previewUrl}
                      alt={project.name}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                      width={project.previewWidth ?? undefined}
                      height={project.previewHeight ?? undefined}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="grid size-full place-items-center">
                      <ImageIcon className="size-8 text-muted-foreground" />
                    </span>
                  )}
                  <span className="absolute bottom-3 left-3 rounded-md bg-black/75 px-2 py-1 text-xs font-bold backdrop-blur">
                    {project.generationCount} результатов
                  </span>
                </Link>
                <CardContent className="flex min-w-0 flex-1 items-start gap-3 p-4">
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Действия с проектом"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={removeProject.isPending}
                          onSelect={() => {
                            removeProject.reset();
                            setProjectPendingDeletion(project);
                          }}
                        >
                          <Trash2 />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
          {!projects.error ? (
            <AppPagination
              page={page}
              pageCount={projects.data?.pageCount ?? 0}
              buildHref={buildPageHref}
              className="mt-8"
            />
          ) : null}
        </div>
      </section>
      <Dialog
        open={Boolean(projectPendingDeletion)}
        onOpenChange={(open) => {
          if (!open && !removeProject.isPending) {
            setProjectPendingDeletion(null);
            removeProject.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить проект?</DialogTitle>
            <DialogDescription>
              Проект «{projectPendingDeletion?.name}» и связанные с ним
              изображения будут удалены без возможности восстановления.
            </DialogDescription>
          </DialogHeader>
          {removeProject.error ? (
            <p className="text-sm text-destructive" role="alert">
              {removeProject.error.message}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={removeProject.isPending}>
                Отмена
              </Button>
            </DialogClose>
            <LoadingButton
              variant="destructive"
              pending={removeProject.isPending}
              pendingText="Удаляем…"
              onClick={() => {
                if (projectPendingDeletion) {
                  removeProject.mutate(projectPendingDeletion.id);
                }
              }}
            >
              <Trash2 />
              Удалить проект
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
