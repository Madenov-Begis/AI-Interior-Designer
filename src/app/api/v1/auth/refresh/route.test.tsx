import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({
  nativeRefresh: vi.fn(),
  store: vi.fn(),
  clear: vi.fn(),
  token: "http-only-refresh" as string | undefined,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (auth.token ? { value: auth.token } : undefined),
  }),
}));
vi.mock("@/server/shared/auth/session-cookies", () => ({
  REFRESH_TOKEN_COOKIE: "ruvie_refresh_token",
  clearSessionCookies: auth.clear,
  storeSessionCookies: auth.store,
}));
vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }));
vi.mock("@/server/shared/db/prisma", () => ({
  getDb: () => ({ testOnly: true }),
}));
vi.mock("@/server/features/auth/native-config", () => ({
  nativeSessionConfig: () => ({ testOnly: true }),
}));
vi.mock("@/server/features/auth/native-session-operations", () => ({
  refreshNativeSession: auth.nativeRefresh,
  InvalidSessionError: class InvalidSessionError extends Error {},
}));
import { InvalidSessionError } from "@/server/features/auth/native-session-operations";
import { POST } from "./route";

afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.clearAllMocks();
  auth.token = "http-only-refresh";
});

test("прямой Google refresh использует HttpOnly cookie и сохраняет прежний HTTP-контракт", async () => {
  auth.nativeRefresh.mockResolvedValue({
    access_token: "native-access",
    refresh_token: "native-secret",
    expires_in: 900,
  });
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(auth.nativeRefresh.mock.calls[0][1]).toBe("http-only-refresh");
  expect(await response.json()).toMatchObject({
    data: { accessToken: "native-access", expiresIn: 900 },
  });
});

test("прямой refresh отличает отзыв сессии от недоступности БД", async () => {
  auth.nativeRefresh.mockRejectedValue(new Error("test database unavailable"));
  expect((await POST(request())).status).toBe(503);
  expect(auth.clear).not.toHaveBeenCalled();
  auth.nativeRefresh.mockRejectedValue(new InvalidSessionError());
  expect((await POST(request())).status).toBe(401);
  expect(auth.clear).toHaveBeenCalledOnce();
});

test("чужой origin не запускает прямое обновление сессии", async () => {
  expect((await POST(request("https://attacker.invalid"))).status).toBe(403);
  expect(auth.nativeRefresh).not.toHaveBeenCalled();
});
function request(origin = "https://api.example.com") {
  return new NextRequest("https://api.example.com/api/v1/auth/refresh", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: "untrusted-body-token" }),
  });
}

test("foreign origins and missing cookies cannot trigger token rotation", async () => {
  expect((await POST(request("https://attacker.invalid"))).status).toBe(403);
  auth.token = undefined;
  expect((await POST(request())).status).toBe(401);
  expect(auth.nativeRefresh).not.toHaveBeenCalled();
});
