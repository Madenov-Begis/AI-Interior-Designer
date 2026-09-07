import { apiData } from "./client";

export const mediaQueries = {
  signedUrl: (
    fileId: string | undefined,
    initialUrl?: string,
    expiresAt?: string,
  ) => ({
    queryKey: ["media", fileId, "signed-url"] as const,
    queryFn: () =>
      apiData<{ url: string; expiresAt: string }>({
        url: `/media/${fileId}/signed-url`,
        method: "GET",
      }),
    enabled: Boolean(fileId),
    initialData: initialUrl
      ? {
          url: initialUrl,
          expiresAt: expiresAt ?? new Date(Date.now() + 600_000).toISOString(),
        }
      : undefined,
    staleTime: 7 * 60_000,
    refetchInterval: 7 * 60_000,
  }),
};
