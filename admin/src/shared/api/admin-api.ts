import { getAdminAuthorization, refreshAdminSession } from "@/shared/auth/admin-supabase";

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "https://api.ruvie.cc").replace(/\/$/, "");

type ApiSuccess<T> = { data: T; meta: { requestId: string } };
type ApiFailure = {
  error: { code: string; message: string; details?: unknown };
  meta: { requestId: string };
};

export class AdminApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

async function execute<T>(path: string, init: RequestInit, retry: boolean): Promise<T> {
  const authorization = await getAdminAuthorization();
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  let body: ApiSuccess<T> | ApiFailure | null = null;
  try {
    body = (await response.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    // A proxy or network edge may return a non-JSON response.
  }
  if (response.status === 401 && retry && authorization?.startsWith("Bearer ")) {
    if (await refreshAdminSession()) return execute<T>(path, init, false);
  }
  if (!response.ok || !body || "error" in body) {
    const failure = body && "error" in body ? body.error : null;
    const requestId = body?.meta.requestId ?? response.headers.get("x-request-id") ?? undefined;
    const error = new AdminApiError(
      failure?.code ?? "HTTP_ERROR",
      failure?.message ?? "Не удалось выполнить запрос",
      response.status,
      requestId,
      failure?.details,
    );
    if (response.status === 401 || response.status === 403) {
      window.dispatchEvent(
        new CustomEvent("ruvie-admin-auth-invalid", {
          detail: { forbidden: response.status === 403 },
        }),
      );
    }
    throw error;
  }
  return body.data;
}

export function adminApi<T>(path: string, init: RequestInit = {}) {
  return execute<T>(path, init, true);
}

export function queryString(values: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
