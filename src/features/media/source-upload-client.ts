import { apiData } from "../../lib/api/client.ts";

type UploadProjectSourceInput = {
  projectId: string;
  file: File;
  signal: AbortSignal;
  fetcher?: typeof fetch;
};

type SourceUploadPayload = {
  data?: Record<string, unknown>;
  error?: {
    message?: string;
  };
};

const ACCEPTED_SOURCE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export function isAcceptedSourceFile(file: File) {
  return (
    ACCEPTED_SOURCE_TYPES.has(file.type) &&
    file.size > 0 &&
    file.size <= MAX_SOURCE_BYTES
  );
}

export async function uploadProjectSource({
  projectId,
  file,
  signal,
  fetcher,
}: UploadProjectSourceInput) {
  signal.throwIfAborted();
  const formData = new FormData();
  formData.set("file", file);

  if (fetcher) {
    const response = await fetcher(`/api/v1/projects/${projectId}/source`, {
      method: "POST",
      body: formData,
      signal,
    });
    const payload = (await response.json()) as SourceUploadPayload;
    if (!response.ok) {
      throw new Error(
        payload.error?.message ?? "Не удалось загрузить фотографию",
      );
    }
    return payload.data ?? {};
  }

  return apiData<Record<string, unknown>>({
    url: `/projects/${projectId}/source`,
    method: "POST",
    data: formData,
    signal,
  });
}

export function createLatestSourceUpload(fetcher?: typeof fetch) {
  let controller: AbortController | null = null;

  return {
    upload(projectId: string, file: File) {
      controller?.abort();
      controller = new AbortController();
      return uploadProjectSource({
        projectId,
        file,
        signal: controller.signal,
        fetcher,
      });
    },
    abort() {
      controller?.abort();
      controller = null;
    },
  };
}
