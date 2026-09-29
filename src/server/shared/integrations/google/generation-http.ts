/** Один запрос без скрытых повторов; заголовки отказа сохраняются для worker. */
export async function generationHttp(
  url: string,
  headers: Headers,
  body: unknown,
  timeoutMs: number,
  transport: typeof fetch = fetch,
) {
  const response = await transport(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw Object.assign(new Error("VERTEX_HTTP_ERROR"), {
      status: response.status,
      retryAfter: response.headers.get("retry-after") ?? undefined,
    });
  }
  return response.json();
}
