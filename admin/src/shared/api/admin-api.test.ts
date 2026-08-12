import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getAdminAuthorization: vi.fn(),
  refreshAdminSession: vi.fn(),
}));

vi.mock("@/shared/auth/admin-supabase", () => auth);

import { adminApi } from "./admin-api";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("adminApi", () => {
  beforeEach(() => {
    auth.getAdminAuthorization.mockResolvedValue("Bearer token");
    auth.refreshAdminSession.mockResolvedValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it("unwraps the standard API envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ data: { ok: true }, meta: { requestId: "r1" } })));
    await expect(adminApi<{ ok: boolean }>("/session")).resolves.toEqual({ ok: true });
  });

  it("refreshes once after 401 and retries the same request", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ error: { code: "UNAUTHORIZED", message: "Истекла сессия" }, meta: { requestId: "r1" } }, 401))
      .mockResolvedValueOnce(response({ data: { ok: true }, meta: { requestId: "r2" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(adminApi<{ ok: boolean }>("/session")).resolves.toEqual({ ok: true });
    expect(auth.refreshAdminSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("preserves the backend error code and request id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: { code: "LAST_ADMIN", message: "Нельзя" }, meta: { requestId: "request-42" } }, 409)));
    await expect(adminApi("/users/id", { method: "PATCH" })).rejects.toMatchObject({
      code: "LAST_ADMIN",
      status: 409,
      requestId: "request-42",
    });
  });
});
