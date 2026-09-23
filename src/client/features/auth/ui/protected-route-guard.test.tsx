import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ApiClientError } from "@/shared/api";
import { ProtectedRouteGuard } from "./protected-route-guard";

const mocks = vi.hoisted(() => ({
  pathname: "/app/9edd7141-b70b-491b-90c9-75e0250dddcf",
  replace: vi.fn(),
  refetch: vi.fn(),
  session: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("../api/client", () => ({
  useAppSessionQuery: mocks.session,
}));
vi.mock("../model/context", () => ({
  AppSessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/shared/providers", () => ({
  useAppText: () => (text: string) => text,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/app/9edd7141-b70b-491b-90c9-75e0250dddcf";
  window.history.replaceState(null, "", mocks.pathname);
});
afterEach(cleanup);

test("проверка сессии показывает скелетон холста, а не отдельный спиннер", () => {
  mocks.session.mockReturnValue({
    isPending: true,
    data: null,
    isError: false,
  });

  const { container } = render(
    <ProtectedRouteGuard>
      <p>Содержимое проекта</p>
    </ProtectedRouteGuard>,
  );

  expect(screen.getByRole("status").textContent).toContain(
    "Открываем рабочее пространство…",
  );
  expect(
    container.querySelectorAll('[data-slot="skeleton"]').length,
  ).toBeGreaterThan(0);
  expect(screen.queryByText("Содержимое проекта")).toBeNull();
});

test("после проверки сессии открывается содержимое проекта", () => {
  mocks.session.mockReturnValue({
    isPending: false,
    data: { user: { id: "user-1" } },
    isError: false,
  });

  render(
    <ProtectedRouteGuard>
      <p>Содержимое проекта</p>
    </ProtectedRouteGuard>,
  );

  expect(screen.getByText("Содержимое проекта")).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
});

test("неавторизованный пользователь отправляется на вход без раскрытия проекта", () => {
  mocks.session.mockReturnValue({
    isPending: false,
    data: null,
    isError: true,
    error: new ApiClientError("UNAUTHORIZED", "Нет сессии", 401, null),
  });

  render(
    <ProtectedRouteGuard>
      <p>Содержимое проекта</p>
    </ProtectedRouteGuard>,
  );

  expect(mocks.replace).toHaveBeenCalledWith(
    "/login?next=%2Fapp%2F9edd7141-b70b-491b-90c9-75e0250dddcf",
  );
  expect(screen.queryByText("Содержимое проекта")).toBeNull();
});

test("сбой проверки сессии сохраняет действие повтора", () => {
  mocks.session.mockReturnValue({
    isPending: false,
    data: null,
    isError: true,
    error: new Error("Сеть недоступна"),
    refetch: mocks.refetch,
  });

  render(
    <ProtectedRouteGuard>
      <p>Содержимое проекта</p>
    </ProtectedRouteGuard>,
  );

  expect(screen.getByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
  expect(mocks.refetch).toHaveBeenCalledTimes(1);
});
