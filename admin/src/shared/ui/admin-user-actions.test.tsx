import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { type AdminUser } from "@/shared/api";
import { AdminUserActions } from "./admin-user-actions";

const user: AdminUser = {
  id: "00000000-0000-4000-8000-000000000000",
  account: "Иван Иванов",
  displayName: "Иван Иванов",
  email: "ivan@example.com",
  phone: null,
  role: "USER",
  status: "ACTIVE",
  balance: 25,
  lastLoginAt: null,
  createdAt: "2026-08-12T00:00:00.000Z",
  updatedAt: "2026-08-12T00:00:00.000Z",
  counts: { projects: 1, generations: 2, paymentOrders: 3 },
};

function renderActions() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MantineProvider>
          <ModalsProvider>
            <AdminUserActions user={user} />
          </ModalsProvider>
        </MantineProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

it("exposes labeled table actions and opens both user dialogs", async () => {
  renderActions();

  expect(
    screen.getByRole("link", { name: "Открыть профиль Иван Иванов" }),
  ).toHaveAttribute("href", `/users/${user.id}`);

  fireEvent.click(
    screen.getByRole("button", { name: "Редактировать Иван Иванов" }),
  );
  const editDialog = await screen.findByRole("dialog", {
    name: "Редактировать пользователя",
  });
  expect(editDialog).toBeInTheDocument();
  fireEvent.click(within(editDialog).getByRole("button", { name: "Закрыть" }));
  await waitFor(() => expect(editDialog).not.toBeInTheDocument());

  fireEvent.click(
    screen.getByRole("button", { name: "Изменить баланс Иван Иванов" }),
  );
  const balanceDialog = await screen.findByRole("dialog", {
    name: "Изменить баланс",
  });
  expect(within(balanceDialog).getByLabelText("Кредиты")).toBeInTheDocument();
  expect(
    within(balanceDialog).getByText(/текущий баланс 25 кр/),
  ).toBeInTheDocument();
});
