import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { adminApi } from "@/shared/api";
import { RoomsPage } from "./rooms-page";

vi.mock("@/shared/api", () => ({ adminApi: vi.fn() }));

const room = {
  id: "00000000-0000-4000-8000-000000000010",
  code: "living-room",
  name: "Гостиная",
  nameEn: "Living room",
  nameUz: "Mehmonxona",
  promptModifier: "Назначение помещения: гостиная и зона отдыха.",
  active: true,
  sortOrder: 10,
  createdAt: "2026-09-14T00:00:00.000Z",
  updatedAt: "2026-09-14T00:00:00.000Z",
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MantineProvider>
        <RoomsPage />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

test("lists rooms and creates a room through the admin form", async () => {
  vi.mocked(adminApi).mockImplementation(async (_path, init) => {
    if (init?.method === "POST") return room;
    return { items: [room] };
  });
  renderPage();

  expect(await screen.findByText("Гостиная")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Создать комнату" }));
  fireEvent.change(await screen.findByLabelText(/Код/), {
    target: { value: "bedroom" },
  });
  fireEvent.change(screen.getByLabelText(/Название \(RU\)/), {
    target: { value: "Спальня" },
  });
  fireEvent.change(screen.getByLabelText(/Название \(EN\)/), {
    target: { value: "Bedroom" },
  });
  fireEvent.change(screen.getByLabelText(/Инструкция для AI/), {
    target: { value: "Назначение помещения: спокойная спальня." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

  await waitFor(() =>
    expect(adminApi).toHaveBeenCalledWith(
      "/api/v1/admin/rooms",
      expect.objectContaining({ method: "POST" }),
    ),
  );
});

test("soft-deactivates a room only after confirmation", async () => {
  vi.mocked(adminApi).mockImplementation(async (_path, init) => {
    if (init?.method === "DELETE") return { ...room, active: false };
    return { items: [room] };
  });
  renderPage();

  fireEvent.click(
    await screen.findByRole("button", { name: "Отключить Гостиная" }),
  );
  expect(
    await screen.findByText(/исчезнет из выбора для новых генераций/),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Отключить" }));

  await waitFor(() =>
    expect(adminApi).toHaveBeenCalledWith(`/api/v1/admin/rooms/${room.id}`, {
      method: "DELETE",
    }),
  );
});
