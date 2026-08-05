"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DesignWorkspace } from "@/client/features/design/ui/design-workspace";
import type { DesignWorkspaceProps } from "@/client/features/design/ui/workspace-types";
import { Button, buttonClassName } from "@/client/shared/components/ui/button";
import { ApiClientError, apiData } from "@/client/shared/api/client";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const workspace = useQuery({
    queryKey: ["workspace", id],
    queryFn: ({ signal }) =>
      apiData<DesignWorkspaceProps>({
        url: `/projects/${id}/workspace`,
        method: "GET",
        signal,
      }),
    enabled: Boolean(id),
    retry: (attempts, error) =>
      !(error instanceof ApiClientError && error.status === 404) &&
      attempts < 1,
  });

  if (workspace.data) {
    return (
      <main className="h-dvh overflow-hidden bg-background text-foreground">
        <DesignWorkspace {...workspace.data} />
      </main>
    );
  }

  const notFound =
    workspace.error instanceof ApiClientError && workspace.error.status === 404;

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
      <div className="grid max-w-md justify-items-center gap-4 text-center">
        {workspace.isError ? (
          <>
            <h1 className="text-xl font-semibold">
              {notFound ? "Проект не найден" : "Не удалось открыть проект"}
            </h1>
            <p className="text-sm text-muted-foreground" role="alert">
              {workspace.error.message}
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
          <>
            <LoaderCircle
              className="size-7 animate-spin text-primary"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">Загружаем проект…</p>
          </>
        )}
      </div>
    </main>
  );
}
