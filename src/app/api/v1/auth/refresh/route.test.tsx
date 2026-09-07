import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({
  refresh: vi.fn(),
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
vi.mock("@/server/shared/integrations/supabase/token-client", () => ({
  createSupabaseTokenClient: () => ({ auth: { refreshSession: auth.refresh } }),
}));
vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }));
import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  auth.token = "http-only-refresh";
  auth.refresh.mockResolvedValue({
    data: {
      session: {
        access_token: "access",
        refresh_token: "rotated-secret",
        expires_in: 3600,
      },
    },
    error: null,
  });
});
function request(origin = "https://api.example.com") {
  return new NextRequest("https://api.example.com/api/v1/auth/refresh", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: "untrusted-body-token" }),
  });
}

test("refresh uses only its cookie, rotates server-side, and never returns the refresh token", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(auth.refresh).toHaveBeenCalledWith({
    refresh_token: "http-only-refresh",
  });
  expect(auth.store).toHaveBeenCalled();
  expect(await response.json()).toMatchObject({
    data: { accessToken: "access", expiresIn: 3600 },
  });
  const second = await POST(request());
  expect(await second.text()).not.toContain("rotated-secret");
  expect(auth.clear).not.toHaveBeenCalled();
});

test("an upstream outage preserves cookies and returns a retryable error", async () => {
  auth.refresh.mockResolvedValue({ data: {}, error: { status: 503 } });
  expect((await POST(request())).status).toBe(503);
  expect(auth.clear).not.toHaveBeenCalled();
});

test("an invalid refresh token expires the session", async () => {
  auth.refresh.mockResolvedValue({ data: {}, error: { status: 400 } });
  expect((await POST(request())).status).toBe(401);
  expect(auth.clear).toHaveBeenCalledOnce();
});

test("foreign origins and missing cookies cannot trigger token rotation", async () => {
  expect((await POST(request("https://attacker.invalid"))).status).toBe(403);
  auth.token = undefined;
  expect((await POST(request())).status).toBe(401);
  expect(auth.refresh).not.toHaveBeenCalled();
});
