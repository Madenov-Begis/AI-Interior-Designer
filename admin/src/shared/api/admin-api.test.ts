import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getAdminAuthorization: vi.fn(),
  clearAdminCredentials: vi.fn(),
}));

vi.mock("@/shared/auth/admin-session", () => auth);

import { adminApi, adminAxios } from "./admin-api";

describe("adminApi Axios client", () => {
  beforeEach(() => {
    auth.getAdminAuthorization.mockReset().mockReturnValue("Bearer token");
    auth.clearAdminCredentials.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("unwraps the API envelope and adds the token in the interceptor", async () => {
    const adapter = vi.fn(async (config) => ({
      data: { data: { ok: true }, meta: { requestId: "r1" } },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    adminAxios.defaults.adapter = adapter;

    await expect(adminApi<{ ok: boolean }>("/session")).resolves.toEqual({ ok: true });
    expect(adapter.mock.calls[0]?.[0].headers.get("Authorization")).toBe("Bearer token");
    expect(adapter.mock.calls[0]?.[0].headers.get("Accept-Language")).toBe("ru");
  });

  it("preserves the backend error code and request id", async () => {
    adminAxios.defaults.adapter = async (config) => {
      const error = new Error("Request failed") as Error & {
        isAxiosError: boolean;
        config: typeof config;
        response: object;
      };
      error.isAxiosError = true;
      error.config = config;
      error.response = {
        data: {
          error: { code: "LAST_ADMIN", message: "Нельзя" },
          meta: { requestId: "request-42" },
        },
        status: 409,
        statusText: "Conflict",
        headers: {},
        config,
      };
      throw error;
    };

    await expect(adminApi("/users/id", { method: "PATCH" })).rejects.toMatchObject({
      code: "LAST_ADMIN",
      status: 409,
      requestId: "request-42",
    });
  });
});
