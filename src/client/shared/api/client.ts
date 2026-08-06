"use client";

import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiFailure, ApiSuccess } from "./types.ts";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "../auth/tokens.ts";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
    skipAuthRefresh?: boolean;
    authRetry?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    skipAuthRedirect?: boolean;
    skipAuthRefresh?: boolean;
    authRetry?: boolean;
  }
}

type RefreshedSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

let refreshRequest: Promise<RefreshedSession> | null = null;

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

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("Refresh token is missing");

  refreshRequest ??= fetch("/api/v1/auth/refresh", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-request-id": requestId(),
    },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Session refresh failed");
      const payload = (await response.json()) as ApiSuccess<RefreshedSession>;
      setAuthTokens(payload.data);
      return payload.data;
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

apiClient.interceptors.request.use((config) => {
  if (!config.headers.has("x-request-id")) {
    config.headers.set("x-request-id", requestId());
  }

  if (!config.headers.has("Authorization")) {
    const accessToken = getAccessToken();
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
    const config = error.config;
    if (
      status === 401 &&
      config &&
      !config.skipAuthRefresh &&
      !config.authRetry &&
      getRefreshToken()
    ) {
      try {
        const session = await refreshSession();
        config.authRetry = true;
        config.headers.set("Authorization", `Bearer ${session.accessToken}`);
        return apiClient.request(config);
      } catch {
        clearAuthTokens();
      }
    }

    if (status === 401) {
      clearAuthTokens();
      redirectToLogin(config);
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
