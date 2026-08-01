import { getAdminPhone } from "./admin-session";
import type { ApiEnvelope } from "./api-types";

const apiBase = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export class AdminApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function adminApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const phone = getAdminPhone();
  if (!phone)
    throw new AdminApiError("UNAUTHORIZED", "Сессия администратора истекла");
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `AdminPhone ${phone}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || "error" in body) {
    const error =
      "error" in body
        ? body.error
        : { code: "HTTP_ERROR", message: "Не удалось выполнить запрос" };
    throw new AdminApiError(error.code, error.message, error.details);
  }
  return body.data;
}
