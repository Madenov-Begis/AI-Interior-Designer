"use client";

import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiFailure, ApiSuccess } from "./types.ts";
import { createSupabaseBrowserClient } from "../supabase/browser.ts";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly requestId: string | null;
  readonly details: unknown;

  constructor(
    code: string,
    message: string,
    status: number | null,
    requestId: string | null,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function redirectToLogin(config?: InternalAxiosRequestConfig) {
  if (
    typeof window === "undefined" ||
    config?.skipAuthRedirect ||
    window.location.pathname === "/login"
  ) {
    return;
  }

  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

export const apiClient = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: { Accept: "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  if (!config.headers.has("x-request-id")) {
    config.headers.set("x-request-id", requestId());
  }

  if (!config.headers.has("Authorization")) {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (accessToken) {
      config.headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiFailure>) => {
    if (error.code === "ERR_CANCELED") return Promise.reject(error);

    const status = error.response?.status ?? null;
    if (status === 401) {
      try {
        await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
      } finally {
        redirectToLogin(error.config);
      }
    }

    const payload = error.response?.data;
    const normalized = new ApiClientError(
      payload?.error?.code ?? "REQUEST_FAILED",
      payload?.error?.message ?? error.message ?? "Запрос не выполнен",
      status,
      payload?.meta?.requestId ??
        error.response?.headers["x-request-id"] ??
        null,
      payload?.error?.details,
    );
    return Promise.reject(normalized);
  },
);

export async function apiData<T>(config: AxiosRequestConfig) {
  const response = await apiClient.request<ApiSuccess<T>>(config);
  return response.data.data;
}
