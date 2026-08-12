import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adminApi: vi.fn(),
  getAdminToken: vi.fn(),
  getDevAdminPhone: vi.fn(),
  setDevAdminPhone: vi.fn(),
  storeAdminToken: vi.fn(),
  clearAdminCredentials: vi.fn(),
}));

vi.mock("@/shared/api", async () => {
  const actual = await vi.importActual<typeof import("@/shared/api")>("@/shared/api");
  return { ...actual, adminApi: mocks.adminApi };
});
vi.mock("./admin-session", () => ({
  getAdminToken: mocks.getAdminToken,
  getDevAdminPhone: mocks.getDevAdminPhone,
  setDevAdminPhone: mocks.setDevAdminPhone,
  storeAdminToken: mocks.storeAdminToken,
  clearAdminCredentials: mocks.clearAdminCredentials,
}));

import { AdminApiError, type AdminSession } from "@/shared/api";
import { AuthProvider, useAuth } from "./auth-provider";

const session: AdminSession = {
  admin: {
    id: "admin-1",
    account: "Администратор",
    displayName: "Администратор",
    email: null,
    phone: "+998901234567",
    role: "ADMIN",
    status: "ACTIVE",
  },
};

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span>{auth.state}</span>
      <span>{auth.session?.admin.account}</span>
      <button onClick={() => void auth.login("abcde")}>login</button>
      <button onClick={() => void auth.logout()}>logout</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <MantineProvider>
      <AuthProvider><Probe /></AuthProvider>
    </MantineProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    mocks.adminApi.mockReset();
    mocks.getAdminToken.mockReset().mockReturnValue(null);
    mocks.getDevAdminPhone.mockReset().mockReturnValue(null);
    mocks.setDevAdminPhone.mockReset();
    mocks.storeAdminToken.mockReset();
    mocks.clearAdminCredentials.mockReset();
  });

  it("restores and validates an existing admin token", async () => {
    mocks.getAdminToken.mockReturnValue("token");
    mocks.adminApi.mockResolvedValue(session);
    renderProvider();

    expect(await screen.findByText("authenticated")).toBeInTheDocument();
    expect(screen.getByText("Администратор")).toBeInTheDocument();
    expect(mocks.adminApi).toHaveBeenCalledWith("/api/v1/admin/session");
  });

  it("shows forbidden when the backend rejects the current role", async () => {
    mocks.getAdminToken.mockReturnValue("token");
    mocks.adminApi.mockRejectedValue(new AdminApiError("FORBIDDEN", "Нет доступа", 403));
    renderProvider();

    expect(await screen.findByText("forbidden")).toBeInTheDocument();
  });

  it("exchanges the code for a token, validates it, and clears it on logout", async () => {
    mocks.adminApi
      .mockResolvedValueOnce({ token: "signed-token", expiresAt: "2099-01-01T00:00:00.000Z", expiresIn: 28_800 })
      .mockResolvedValueOnce(session);
    renderProvider();
    expect(await screen.findByText("unauthenticated")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "login" }));
    expect(await screen.findByText("authenticated")).toBeInTheDocument();
    expect(mocks.adminApi).toHaveBeenNthCalledWith(1, "/api/v1/admin/login", {
      method: "POST",
      body: JSON.stringify({ code: "abcde" }),
    });
    expect(mocks.storeAdminToken).toHaveBeenCalledWith({
      token: "signed-token",
      expiresAt: "2099-01-01T00:00:00.000Z",
      expiresIn: 28_800,
    });

    fireEvent.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() => expect(screen.getByText("unauthenticated")).toBeInTheDocument());
    expect(mocks.clearAdminCredentials).toHaveBeenCalled();
  });

  it("invalidates the UI immediately after a forbidden API event", async () => {
    mocks.getAdminToken.mockReturnValue("token");
    mocks.adminApi.mockResolvedValue(session);
    renderProvider();
    expect(await screen.findByText("authenticated")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent("ruvie-admin-auth-invalid", { detail: { forbidden: true } }));
    });
    expect(await screen.findByText("forbidden")).toBeInTheDocument();
    expect(mocks.clearAdminCredentials).toHaveBeenCalled();
  });
});
