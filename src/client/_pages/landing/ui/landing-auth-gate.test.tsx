import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { LandingAuthGate, LandingAuthLink } from "./landing-auth-gate";

vi.mock("@/features/auth/api/client", () => ({
  loadAppSession: vi.fn(async () => null),
}));

test("CTA открывает форму входа на лендинге и требует согласия", async () => {
  render(
    <LandingAuthGate locale="ru">
      <LandingAuthLink href="/app">Создать дизайн</LandingAuthLink>
    </LandingAuthGate>,
  );

  fireEvent.click(screen.getByRole("link", { name: "Создать дизайн" }));
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toBeTruthy();
  expect(screen.getByText("Вы получите 10 бесплатных кредитов")).toBeTruthy();
  const google = screen.getByRole("link", { name: "Продолжить с Google" });
  expect(google.querySelector('img[src="/images/google-g.svg"]')).toBeTruthy();
  expect(google.getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(screen.getByRole("checkbox"));
  await waitFor(() =>
    expect(google.getAttribute("aria-disabled")).toBe("false"),
  );
  expect(google.getAttribute("href")).toContain("next=%2Fapp");
  fireEvent.click(screen.getByRole("button", { name: "Закрыть" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("link", { name: "Создать дизайн" }),
    ),
  );
});

test("ошибка проверки сессии не мешает открыть вход", async () => {
  const { loadAppSession } = await import("@/features/auth/api/client");
  vi.mocked(loadAppSession).mockRejectedValueOnce(new Error("network"));
  render(
    <LandingAuthGate locale="ru">
      <LandingAuthLink href="/app/credits">Купить</LandingAuthLink>
    </LandingAuthGate>,
  );
  fireEvent.click(screen.getByRole("link", { name: "Купить" }));
  expect(await screen.findByRole("dialog")).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Продолжить с Google" })
      .getAttribute("href"),
  ).toContain("next=%2Fapp%2Fcredits");
});
