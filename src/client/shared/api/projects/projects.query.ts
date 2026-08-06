import { apiData, ApiClientError } from "../client.ts";
import type { ProjectWorkspaceDto } from "./project-workspace.ts";

export const projectsQueries = {
  all: () => ["projects"] as const,

  workspace: (id: string) => ({
    queryKey: ["projects", id, "workspace"] as const,
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      apiData<ProjectWorkspaceDto>({
        url: `/projects/${id}/workspace`,
        method: "GET",
        signal,
      }),
    enabled: Boolean(id),
    retry: (attempts: number, error: unknown) =>
      !(error instanceof ApiClientError && error.status === 404) &&
      attempts < 1,
  }),

  entry: () => ({
    queryKey: ["projects", "entry"] as const,
    queryFn: () =>
      apiData<{ projectId: string }>({
        url: "/projects/entry",
        method: "POST",
      }),
    retry: false as const,
    staleTime: 0,
  }),
};
