type Initialize = (input: {
  target: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}) => Promise<{ id: string; url: string }>;

export async function stageUploadBody(
  target: string,
  form: FormData,
  initialize: Initialize,
  signal?: AbortSignal,
) {
  const fields: Record<string, string[]> = {};
  const uploads: Array<{ field: string; id: string }> = [];
  for (const [field, entry] of form.entries()) {
    const value =
      typeof entry === "string" &&
      field === "canvasState" &&
      entry.length > 512_000
        ? new File([entry], "canvas-state.json", { type: "application/json" })
        : entry;
    signal?.throwIfAborted();
    if (typeof value === "string") {
      (fields[field] ??= []).push(value);
      continue;
    }
    const ticket = await initialize({
      target,
      originalName: value.name,
      mimeType: value.type,
      sizeBytes: value.size,
    });
    const response = await fetch(ticket.url, {
      method: "PUT",
      body: value,
      credentials: "omit",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(120_000)])
        : AbortSignal.timeout(120_000),
      headers: {
        "content-type": value.type,
        "x-upsert": "false",
        "cache-control": "max-age=0",
      },
    });
    if (!response.ok)
      throw new Error(
        "Не удалось загрузить файл. Проверьте соединение и повторите попытку",
      );
    uploads.push({ field, id: ticket.id });
  }
  return { fields, uploads };
}
