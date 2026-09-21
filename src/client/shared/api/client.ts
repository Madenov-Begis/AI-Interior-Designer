"use client";

import { stageUploadBody } from "./staged-upload.ts";
import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiFailure, ApiSuccess } from "./types.ts";
import {
  clearAuthTokens,
  getAccessToken,
  setAuthTokens,
} from "../auth/tokens.ts";
import { API_BASE_URL, apiUrl } from "./url.ts";

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
  expiresIn: number;
};

let refreshRequest: Promise<RefreshedSession> | null = null;

function currentLocale() {
  if (typeof document === "undefined") return "en";
  const value = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("NEXT_LOCALE="))
    ?.split("=")[1];
  return value === "ru" || value === "uz" || value === "en" ? value : "en";
}

function clientMessage(
  key: "sessionExpired" | "refreshFailed" | "authUnavailable" | "requestFailed",
) {
  const locale = currentLocale();
  const messages = {
    en: {
      sessionExpired: "Your session has expired",
      refreshFailed: "Could not refresh the session. Please try again",
      authUnavailable: "Could not refresh the session. Check your connection",
      requestFailed: "The request failed",
    },
    ru: {
      sessionExpired: "Сессия истекла",
      refreshFailed: "Не удалось обновить сессию. Попробуйте ещё раз",
      authUnavailable: "Не удалось обновить сессию. Проверьте соединение",
      requestFailed: "Запрос не выполнен",
    },
    uz: {
      sessionExpired: "Sessiya muddati tugadi",
      refreshFailed: "Sessiyani yangilab bo‘lmadi. Qayta urinib ko‘ring",
      authUnavailable:
        "Sessiyani yangilab bo‘lmadi. Internet aloqasini tekshiring",
      requestFailed: "So‘rov bajarilmadi",
    },
  } as const;
  return messages[locale][key];
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
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

async function refreshSession(failedToken: string | null) {
  const perform = async () => {
    const currentToken = getAccessToken();
    if (currentToken && currentToken !== failedToken)
      return { accessToken: currentToken, expiresIn: 60 };
    const response = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Accept: "application/json",
        "Accept-Language": currentLocale(),
        "x-request-id": requestId(),
      },
    });
    if (!response.ok)
      throw new ApiClientError(
        "REFRESH_FAILED",
        response.status === 401
          ? clientMessage("sessionExpired")
          : clientMessage("refreshFailed"),
        response.status,
        response.headers.get("x-request-id"),
      );
    const payload = (await response.json()) as ApiSuccess<RefreshedSession>;
    setAuthTokens(payload.data);
    return payload.data;
  };
  refreshRequest ??= (async () => {
    if (typeof navigator !== "undefined" && navigator.locks)
      return await navigator.locks.request("ruvie:session-refresh", perform);
    return perform();
  })().finally(() => {
    refreshRequest = null;
  });
  return refreshRequest;
}

apiClient.interceptors.request.use(async (config) => {
  if (
    config.data instanceof FormData &&
    config.url &&
    /^\/(projects\/[^/]+\/(source|references|visual-prompt|generations)|generations\/[^/]+\/refinements)$/.test(
      config.url,
    )
  ) {
    config.data = await stageUploadBody(
      config.url,
      config.data,
      (input) =>
        apiData({
          url: "/uploads",
          method: "POST",
          data: input,
          signal: config.signal,
        }),
      config.signal instanceof AbortSignal ? config.signal : undefined,
    );
    config.headers.set("Content-Type", "application/json");
  }
  if (!config.headers.has("x-request-id")) {
    config.headers.set("x-request-id", requestId());
  }
  if (!config.headers.has("Accept-Language")) {
    config.headers.set("Accept-Language", currentLocale());
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
      !config.authRetry
    ) {
      try {
        const failedToken =
          String(config.headers.get("Authorization") ?? "").replace(
            /^Bearer /i,
            "",
          ) || null;
        const session = await refreshSession(failedToken);
        config.authRetry = true;
        config.headers.set("Authorization", `Bearer ${session.accessToken}`);
        return apiClient.request(config);
      } catch (refreshError) {
        if (
          !(refreshError instanceof ApiClientError) ||
          refreshError.status !== 401
        ) {
          return Promise.reject(
            refreshError instanceof ApiClientError
              ? refreshError
              : new ApiClientError(
                  "AUTH_UNAVAILABLE",
                  clientMessage("authUnavailable"),
                  503,
                  null,
                ),
          );
        }
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
      payload?.error?.message ?? clientMessage("requestFailed"),
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
