"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingButton, WorkspaceLoadingSkeleton } from "@/shared/ui";
import { projectsQueries } from "@/shared/api/projects";
import { useAppText } from "@/shared/providers";

export function ProjectEntryPage() {
  const router = useRouter();
  const entry = useQuery(projectsQueries.entry());
  const t = useAppText();

  useEffect(() => {
    if (entry.data?.projectId) {
      router.replace(`/app/${entry.data.projectId}`);
    }
  }, [entry.data?.projectId, router]);

  if (!entry.isError) {
    return (
      <main id="main-content" className="min-h-dvh" tabIndex={-1}>
        <WorkspaceLoadingSkeleton
          fullScreen
          label={t("Открываем рабочее пространство…")}
        />
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="grid min-h-dvh place-items-center bg-background px-4 text-foreground"
      tabIndex={-1}
    >
      <div className="grid max-w-sm justify-items-center gap-4 text-center">
        <p className="text-sm text-destructive" role="alert">
          {entry.error.message}
        </p>
        <LoadingButton
          pending={entry.isFetching}
          pendingText={t("Пробуем снова…")}
          onClick={() => entry.refetch()}
        >
          {t("Повторить")}
        </LoadingButton>
      </div>
    </main>
  );
}
