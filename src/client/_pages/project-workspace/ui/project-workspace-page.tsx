"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DesignWorkspace } from "./design-workspace";
import { Button, buttonClassName } from "@/shared/ui";
import { ApiClientError } from "@/shared/api";
import { projectsQueries } from "@/shared/api/projects";

export function ProjectWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const workspace = useQuery(projectsQueries.workspace(id));

  if (workspace.data) {
    return (
      <main className="h-full overflow-hidden bg-background text-foreground">
        <DesignWorkspace {...workspace.data} />
      </main>
    );
  }

  const notFound =
    workspace.error instanceof ApiClientError && workspace.error.status === 404;

  return (
    <main className="relative grid h-full place-items-center bg-background px-4 text-foreground">
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
                <Button onClick={() => workspace.refetch()}>Повторить</Button>
              ) : null}
              <Link href="/app/projects" className={buttonClassName("outline")}>
                Все проекты
              </Link>
            </div>
          </>
        ) : (
          <div
            className="absolute inset-x-0 top-0 h-px overflow-hidden bg-border/30"
            role="status"
            aria-live="polite"
          >
            <div
              className="h-full w-full animate-pulse bg-primary/60"
              aria-hidden="true"
            />
            <span className="sr-only">Открываем проект…</span>
          </div>
        )}
      </div>
    </main>
  );
}
