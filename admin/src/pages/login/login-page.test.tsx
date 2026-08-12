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

  it("requires at least five characters", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Код доступа"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByText("Код должен содержать минимум 5 символов")).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it("submits the access code through the production auth flow", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Код доступа"), { target: { value: "abcde" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() => expect(auth.login).toHaveBeenCalledWith("abcde"));
  });

  it("keeps the passwordless fallback explicitly dev-only", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Dev-only вход по телефону" }));
    expect(screen.queryByLabelText("Код доступа")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Номер телефона"), { target: { value: "+998901234567" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() => expect(auth.devLogin).toHaveBeenCalledWith("+998901234567"));
  });
});
