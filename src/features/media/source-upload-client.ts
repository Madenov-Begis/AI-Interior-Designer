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
  fetcher = fetch,
}: UploadProjectSourceInput) {
  signal.throwIfAborted();
  const formData = new FormData();
  formData.set("file", file);

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

export function sourceProjectName(fileName: string) {
  return (
    fileName
      .trim()
      .replace(/\.[^.]+$/, "")
      .trim()
      .slice(0, 120) || "Новый интерьер"
  );
}
