import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ login: vi.fn(), devLogin: vi.fn() }));

vi.mock("@/shared/auth", () => ({
  useAuth: () => ({ login: auth.login, devLogin: auth.devLogin }),
}));

import { LoginPage } from "./login-page";

function renderPage() {
  render(<MantineProvider><LoginPage /></MantineProvider>);
}

describe("LoginPage", () => {
  beforeEach(() => {
    auth.login.mockReset().mockResolvedValue(undefined);
    auth.devLogin.mockReset().mockResolvedValue(undefined);
  });

  it("validates the Uzbek phone format before Supabase login", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Номер телефона"), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByText("Введите номер в формате +998XXXXXXXXX")).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it("submits phone and password through the production auth flow", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Номер телефона"), { target: { value: "+998901234567" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() => expect(auth.login).toHaveBeenCalledWith("+998901234567", "secret"));
  });

  it("keeps the passwordless fallback explicitly dev-only", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Dev-only вход без пароля" }));
    expect(screen.queryByLabelText("Пароль")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Номер телефона"), { target: { value: "+998901234567" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() => expect(auth.devLogin).toHaveBeenCalledWith("+998901234567"));
  });
});
