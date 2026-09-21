import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { adminApi } from "@/shared/api";
import { CreditPackagesPage } from "./credit-packages-page";

vi.mock("@/shared/api", () => ({ adminApi: vi.fn() }));

const packageFixture = {
  id: "00000000-0000-4000-8000-000000000000",
  code: "standard",
  name: "Стандарт",
  nameEn: "Standard",
  nameUz: "Standart",
  description: "Оптимально для ремонта",
  descriptionEn: "Best for renovation",
  descriptionUz: "Ta’mirlash uchun maqbul",
  credits: 60,
  priceUzs: 69_000,
  popular: true,
  active: true,
  sortOrder: 20,
  createdAt: "2026-08-12T00:00:00.000Z",
  updatedAt: "2026-08-12T00:00:00.000Z",
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MantineProvider>
          <ModalsProvider>
            <CreditPackagesPage />
          </ModalsProvider>
        </MantineProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

it("lists packages and creates a new package through the CRUD form", async () => {
  vi.mocked(adminApi).mockImplementation(async (path, init) => {
    if (init?.method === "POST") return packageFixture;
    return { items: [packageFixture] };
  });
  renderPage();

  expect(await screen.findByText("Стандарт")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Создать пакет" }));
  expect(await screen.findByText("Новый пакет")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Код/), { target: { value: "plus" } });
  fireEvent.change(screen.getByLabelText(/Название \(RU\)/), {
    target: { value: "Плюс" },
  });
  fireEvent.change(screen.getByLabelText(/Название \(EN\)/), {
    target: { value: "Plus" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

  await waitFor(() =>
    expect(adminApi).toHaveBeenCalledWith(
      "/api/v1/admin/credit-packages",
      expect.objectContaining({ method: "POST" }),
    ),
  );
});
