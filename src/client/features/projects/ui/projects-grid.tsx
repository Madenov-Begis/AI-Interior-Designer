"use client";

import {
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
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/client/shared/components/ui/alert";
import { Button } from "@/client/shared/components/ui/button";
import { Card, CardContent } from "@/client/shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/shared/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/client/shared/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/client/shared/components/ui/input-group";
import { Skeleton } from "@/client/shared/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/client/shared/components/ui/toggle-group";
import { apiData } from "@/client/shared/api/client";
import { DEFAULT_PROJECT_NAME } from "@/client/features/projects/naming";
import { cn } from "@/client/shared/lib/cn";

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

export function ProjectsGrid() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const projects = useInfiniteQuery({
    queryKey: ["projects"],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      apiData<ProjectsPayload>({
        url: "/projects",
        method: "GET",
        params: { limit: 40, cursor: pageParam || undefined },
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
    onSuccess: (_data, id) => {
      queryClient.setQueryData<InfiniteData<ProjectsPayload>>(
        ["projects"],
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((project) => project.id !== id),
                })),
              }
            : current,
      );
    },
  });

  const loadedProjects = useMemo(
    () => projects.data?.pages.flatMap((page) => page.items) ?? [],
    [projects.data?.pages],
  );
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    if (!query) return loadedProjects;
    return loadedProjects.filter((project) =>
      project.name.toLocaleLowerCase("ru").includes(query),
    );
  }, [loadedProjects, search]);

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
            {loadedProjects.length}
          </span>
        </div>
        <Button variant="ghost" className="mt-2 w-full justify-start">
          <Plus data-icon="inline-start" />
          Новая папка
        </Button>
      </aside>

      <section className="min-w-0">
        <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center">
          <InputGroup className="h-12 min-w-0 flex-1 bg-card">
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по названию проекта"
              aria-label="Поиск по названию проекта"
            />
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
          </InputGroup>
          <Button variant="secondary" size="lg">
            <SlidersHorizontal data-icon="inline-start" />
            Категория
          </Button>
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
          {projects.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="aspect-[4/5] rounded-[18px]" />
              ))}
            </div>
          ) : null}

          {projects.error ? (
            <Alert variant="destructive">
              <AlertTitle>Не удалось загрузить проекты</AlertTitle>
              <AlertDescription>{projects.error.message}</AlertDescription>
            </Alert>
          ) : null}

          {!projects.isLoading && filteredProjects.length === 0 ? (
            <Empty className="min-h-80 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Plus />
                </EmptyMedia>
                <EmptyTitle>Создать первый проект</EmptyTitle>
                <EmptyDescription>
                  Фото комнаты прикрепляется сразу на холсте
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  onClick={() => createProject.mutate()}
                  disabled={createProject.isPending}
                >
                  <Plus data-icon="inline-start" />
                  {createProject.isPending ? "Создаём…" : "Создать проект"}
                </Button>
              </EmptyContent>
            </Empty>
          ) : null}

          <div
            className={cn(
              "grid",
              view === "grid" ? "gap-4 sm:grid-cols-2 xl:grid-cols-4" : "gap-3",
            )}
          >
            {filteredProjects.map((project) => (
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
                          onSelect={() => removeProject.mutate(project.id)}
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
          {projects.hasNextPage ? (
            <div className="mt-6 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => projects.fetchNextPage()}
                disabled={projects.isFetchingNextPage}
              >
                {projects.isFetchingNextPage ? "Загружаем…" : "Показать ещё"}
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
