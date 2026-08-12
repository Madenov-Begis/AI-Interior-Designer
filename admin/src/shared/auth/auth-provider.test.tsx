import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adminApi: vi.fn(),
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getDevAdminPhone: vi.fn(),
  setDevAdminPhone: vi.fn(),
  authCallback: null as ((event: string) => void) | null,
}));

vi.mock("@/shared/api", async () => {
  const actual = await vi.importActual<typeof import("@/shared/api")>("@/shared/api");
  return { ...actual, adminApi: mocks.adminApi };
});

vi.mock("./admin-supabase", () => ({
  adminSupabase: {
    auth: {
      getSession: mocks.getSession,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      onAuthStateChange: (callback: (event: string) => void) => {
        mocks.authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
  getDevAdminPhone: mocks.getDevAdminPhone,
  setDevAdminPhone: mocks.setDevAdminPhone,
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
      <button onClick={() => void auth.login("+998901234567", "secret")}>login</button>
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
    mocks.getSession.mockReset().mockResolvedValue({ data: { session: null } });
    mocks.signInWithPassword.mockReset().mockResolvedValue({ error: null });
    mocks.signOut.mockReset().mockResolvedValue({ error: null });
    mocks.getDevAdminPhone.mockReset().mockReturnValue(null);
    mocks.setDevAdminPhone.mockReset();
    mocks.authCallback = null;
  });

  it("restores and validates an existing Supabase session", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: "token" } } });
    mocks.adminApi.mockResolvedValue(session);
    renderProvider();

    expect(await screen.findByText("authenticated")).toBeInTheDocument();
    expect(screen.getByText("Администратор")).toBeInTheDocument();
    expect(mocks.adminApi).toHaveBeenCalledWith("/api/v1/admin/session");
  });

  it("shows forbidden when the backend rejects the current role", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: "token" } } });
    mocks.adminApi.mockRejectedValue(new AdminApiError("FORBIDDEN", "Нет доступа", 403));
    renderProvider();

    expect(await screen.findByText("forbidden")).toBeInTheDocument();
  });

  it("uses phone/password login, validates access, and clears both sessions on logout", async () => {
    mocks.adminApi.mockResolvedValue(session);
    renderProvider();
    expect(await screen.findByText("unauthenticated")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "login" }));
    expect(await screen.findByText("authenticated")).toBeInTheDocument();
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ phone: "+998901234567", password: "secret" });

    fireEvent.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() => expect(screen.getByText("unauthenticated")).toBeInTheDocument());
    expect(mocks.setDevAdminPhone).toHaveBeenLastCalledWith(null);
    expect(mocks.signOut).toHaveBeenCalled();
  });

  it("invalidates the UI immediately after a forbidden API event", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: "token" } } });
    mocks.adminApi.mockResolvedValue(session);
    renderProvider();
    expect(await screen.findByText("authenticated")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent("ruvie-admin-auth-invalid", { detail: { forbidden: true } }));
    });
    expect(await screen.findByText("forbidden")).toBeInTheDocument();
    expect(mocks.signOut).toHaveBeenCalled();
  });
});
