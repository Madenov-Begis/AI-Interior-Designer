import {
  Button,
  Drawer,
  Group,
  NumberInput,
  Select,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { creditAdjustmentSchema } from "../features/users/schema";
import { adminApi } from "../shared/api";
import { useAdminQuery, type ListResponse } from "../entities/admin/hooks";
import { PageFrame } from "../widgets/page-frame";
import { ResourceTable } from "../widgets/resource-table";

type User = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  role: string;
  status: string;
  createdAt: string;
  plan?: { name: string } | null;
};
export function UsersPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<User | null>(null);
  const [opened, handlers] = useDisclosure(false);
  const client = useQueryClient();
  const users = useAdminQuery<ListResponse<User>>(
    ["users", query],
    `/api/v1/admin/users?limit=30&query=${encodeURIComponent(query)}`,
  );
  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      amount: 0,
      reason: "",
      idempotencyKey: crypto.randomUUID(),
    },
    validate: (values) => {
      const result = creditAdjustmentSchema.safeParse(values);
      return result.success
        ? {}
        : Object.fromEntries(
            Object.entries(result.error.flatten().fieldErrors).map(
              ([key, messages]) => [
                key,
                messages?.[0] ?? "Некорректное значение",
              ],
            ),
          );
    },
  });
  const adjust = useMutation({
    mutationFn: (value: {
      amount: number;
      reason: string;
      idempotencyKey: string;
    }) =>
      adminApi(`/api/v1/admin/users/${selected?.id}/credit-adjustments`, {
        method: "POST",
        body: JSON.stringify(value),
      }),
    onSuccess: () => {
      notifications.show({ color: "green", message: "Баланс скорректирован" });
      client.invalidateQueries({ queryKey: ["users"] });
      handlers.close();
    },
  });
  return (
    <PageFrame
      title="Пользователи"
      description="Аккаунты, тарифы и индивидуальные лимиты"
      actions={
        <TextInput
          placeholder="Поиск по имени, email или номеру"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          w={320}
        />
      }
    >
      <ResourceTable
        loading={users.isLoading}
        headers={["Пользователь", "Роль", "Тариф", "Статус", "Регистрация", ""]}
        rows={(users.data?.items ?? []).map((user) => [
          user.displayName ?? user.email ?? user.phone ?? "—",
          user.role,
          user.plan?.name ?? "—",
          user.status,
          new Date(user.createdAt).toLocaleDateString("ru-RU"),
          <Button
            key="action"
            size="xs"
            variant="light"
            onClick={() => {
              setSelected(user);
              handlers.open();
            }}
          >
            Баланс
          </Button>,
        ])}
      />
      <Drawer
        opened={opened}
        onClose={handlers.close}
        title={`Корректировка: ${selected?.displayName ?? selected?.email ?? selected?.phone ?? ""}`}
        position="right"
        size="md"
      >
        <form onSubmit={form.onSubmit((values) => adjust.mutate(values))}>
          <Stack>
            <NumberInput
              label="Кредиты"
              description="Положительное значение начисляет, отрицательное списывает"
              allowDecimal={false}
              key={form.key("amount")}
              {...form.getInputProps("amount")}
            />
            <Textarea
              label="Причина"
              minRows={3}
              key={form.key("reason")}
              {...form.getInputProps("reason")}
            />
            <Button type="submit" loading={adjust.isPending} color="renoa">
              Сохранить корректировку
            </Button>
          </Stack>
        </form>
      </Drawer>
    </PageFrame>
  );
}
