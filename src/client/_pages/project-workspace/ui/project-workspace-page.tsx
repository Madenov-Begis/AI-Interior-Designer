"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DesignWorkspace } from "./design-workspace";
import {
  buttonClassName,
  LoadingButton,
  LoadingRegion,
  Skeleton,
} from "@/shared/ui";
import { ApiClientError } from "@/shared/api";
import { projectsQueries } from "@/shared/api/projects";

export function ProjectWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const workspace = useQuery(projectsQueries.workspace(id));

  if (workspace.data) {
    return (
      <main
        id="main-content"
        className="h-full overflow-hidden bg-background text-foreground"
        tabIndex={-1}
      >
        <DesignWorkspace key={workspace.data.project.id} {...workspace.data} />
      </main>
    );
  }

  const notFound =
    workspace.error instanceof ApiClientError && workspace.error.status === 404;

  return (
    <main
      id="main-content"
      className="relative grid h-full place-items-center bg-background px-4 text-foreground"
      tabIndex={-1}
    >
      <div className="grid max-w-md justify-items-center gap-4 text-center">
        {workspace.isError ? (
          <>
            <h1 className="text-xl font-semibold">
              {notFound ? "Проект не найден" : "Не удалось открыть проект"}
            </h1>
            <p className="text-sm text-muted-foreground" role="alert">
              {(workspace.error as Error).message}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {!notFound ? (
                <LoadingButton
                  pending={workspace.isFetching}
                  pendingText="Пробуем снова…"
                  onClick={() => workspace.refetch()}
                >
                  Повторить
                </LoadingButton>
              ) : null}
              <Link href="/app/projects" className={buttonClassName("outline")}>
                Все проекты
              </Link>
            </div>
          </>
        ) : (
          <LoadingRegion
            label="Открываем проект и подготавливаем рабочее пространство…"
            className="absolute inset-0 grid min-h-0 min-w-0 min-[1200px]:grid-cols-[minmax(0,1fr)_380px]"
          >
            <section className="page-grid relative min-h-0 overflow-hidden">
              <div className="absolute inset-0 grid place-items-center p-6">
                <div className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/25">
                  <div className="flex h-16 items-center justify-between border-b border-border px-5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="aspect-[4/3] w-full rounded-none bg-secondary/70" />
                </div>
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <Skeleton className="size-11 rounded-xl" />
                <Skeleton className="h-11 w-24 rounded-xl" />
              </div>
            </section>
            <aside className="hidden min-h-0 border-l border-border bg-card p-5 min-[1200px]:block">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-5 h-24 w-full rounded-xl" />
              <Skeleton className="mt-5 h-32 w-full rounded-xl" />
              <div className="mt-5 grid grid-cols-3 gap-2">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
              <Skeleton className="mt-8 h-12 w-full rounded-xl" />
            </aside>
          </LoadingRegion>
        )}
      </div>
    </main>
  );
}
