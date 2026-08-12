import axios, { AxiosHeaders } from "axios";
import { clearAdminCredentials, getAdminAuthorization } from "@/shared/auth/admin-session";

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

export const adminAxios = axios.create({
  baseURL: apiBase,
  timeout: 30_000,
});

adminAxios.interceptors.request.use((config) => {
  const authorization = getAdminAuthorization();
  if (authorization) config.headers.set("Authorization", authorization);
  return config;
});

adminAxios.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        clearAdminCredentials();
        window.dispatchEvent(
          new CustomEvent("ruvie-admin-auth-invalid", {
            detail: { forbidden: status === 403 },
          }),
        );
      }
    }
    return Promise.reject(error);
  },
);

function axiosHeaders(input: HeadersInit | undefined, hasBody: boolean) {
  const headers = new AxiosHeaders();
  new Headers(input).forEach((value, key) => headers.set(key, value));
  if (hasBody && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  return headers;
}

export function adminApi<T>(path: string, init: RequestInit = {}) {
  return adminAxios
    .request<ApiSuccess<T> | ApiFailure>({
      url: path,
      method: init.method ?? "GET",
      data: init.body,
      headers: axiosHeaders(init.headers, Boolean(init.body)),
      signal: init.signal ?? undefined,
    })
    .then((response) => {
      if ("error" in response.data) {
        throw new AdminApiError(
          response.data.error.code,
          response.data.error.message,
          response.status,
          response.data.meta.requestId,
          response.data.error.details,
        );
      }
      return response.data.data;
    })
    .catch((error: unknown) => {
      if (error instanceof AdminApiError) throw error;
      if (!axios.isAxiosError<ApiFailure>(error)) throw error;
      const failure = error.response?.data?.error;
      throw new AdminApiError(
        failure?.code ?? "HTTP_ERROR",
        failure?.message ?? "Не удалось выполнить запрос",
        error.response?.status ?? 0,
        error.response?.data?.meta.requestId ??
          error.response?.headers["x-request-id"],
        failure?.details,
      );
    });
}

export function queryString(values: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
