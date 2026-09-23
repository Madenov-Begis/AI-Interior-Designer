"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DesignWorkspace } from "./design-workspace";
import {
  buttonClassName,
  LoadingButton,
  WorkspaceLoadingSkeleton,
} from "@/shared/ui";
import { ApiClientError } from "@/shared/api";
import { projectsQueries } from "@/shared/api/projects";
import { useAppText } from "@/shared/providers";

export function ProjectWorkspacePage() {
  const t = useAppText();
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

  if (!workspace.isError) {
    return (
      <main
        id="main-content"
        className="h-full overflow-hidden bg-background"
        tabIndex={-1}
      >
        <WorkspaceLoadingSkeleton
          label={t("Открываем проект и подготавливаем рабочее пространство…")}
        />
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="relative grid h-full place-items-center bg-background px-4 text-foreground"
      tabIndex={-1}
    >
      <div className="grid max-w-md justify-items-center gap-4 text-center">
        <h1 className="text-xl font-semibold">
          {notFound ? t("Проект не найден") : t("Не удалось открыть проект")}
        </h1>
        <p className="text-sm text-muted-foreground" role="alert">
          {t((workspace.error as Error).message)}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {!notFound ? (
            <LoadingButton
              pending={workspace.isFetching}
              pendingText={t("Пробуем снова…")}
              onClick={() => workspace.refetch()}
            >
              {t("Повторить")}
            </LoadingButton>
          ) : null}
          <Link href="/app/projects" className={buttonClassName("outline")}>
            {t("Все проекты")}
          </Link>
        </div>
      </div>
    </main>
  );
}
