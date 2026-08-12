import {
  Anchor,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi, type AdminUserDetail, type UserRole, type UserStatus } from "@/shared/api";
import { formatDateTime, formatNumber } from "@/shared/lib";
import { AsyncState, EnumBadge, PageFrame } from "@/shared/ui";
import {
  resolveCreditAdjustmentAttempt,
  type CreditAdjustmentAttempt,
  type CreditAdjustmentValues,
} from "./credit-adjustment-attempt";

type UserUpdate = {
  role: UserRole;
  status: UserStatus;
};

const roleLabels = { USER: "Пользователь", ADMIN: "Администратор" };
const statusLabels = { ACTIVE: "Активен", BLOCKED: "Заблокирован", DELETED: "Удалён" };
const statusColors = { ACTIVE: "green", BLOCKED: "red", DELETED: "gray" };

export function UserDetailPage() {
  const { id = "" } = useParams();
  const client = useQueryClient();
  const user = useQuery({ queryKey: ["admin", "users", id], queryFn: () => adminApi<AdminUserDetail>(`/api/v1/admin/users/${id}`) });
  const form = useForm<UserUpdate>({
    initialValues: { role: "USER", status: "ACTIVE" },
  });
  useEffect(() => {
    if (!user.data) return;
    form.setValues({
      role: user.data.role,
      status: user.data.status,
    });
    form.resetDirty();
    // The form intentionally follows the latest server snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.data]);

  const update = useMutation({
    mutationFn: (values: UserUpdate) =>
      adminApi<AdminUserDetail>(`/api/v1/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Пользователь обновлён" });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin", "users"] }),
        client.invalidateQueries({ queryKey: ["admin", "users", id] }),
      ]);
    },
  });

  const [adjustmentAttempt, setAdjustmentAttempt] = useState<CreditAdjustmentAttempt | null>(null);
  const adjustment = useForm({ initialValues: { amount: 0, reason: "" } });
  const adjust = useMutation({
    mutationFn: ({ values, attempt }: { values: CreditAdjustmentValues; attempt: CreditAdjustmentAttempt }) =>
      adminApi<{ userId: string; balance: number }>(`/api/v1/admin/users/${id}/credit-adjustments`, {
        method: "POST",
        body: JSON.stringify({ ...values, idempotencyKey: attempt.idempotencyKey }),
      }),
    onSuccess: async (_result, variables) => {
      notifications.show({ color: "green", message: "Баланс скорректирован" });
      adjustment.reset();
      setAdjustmentAttempt((current) =>
        current?.idempotencyKey === variables.attempt.idempotencyKey ? null : current,
      );
      await client.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const submitUser = (values: UserUpdate) => {
    const destructive = Boolean(
      (user.data?.role === "ADMIN" && values.role === "USER") ||
      (user.data?.status === "ACTIVE" && (values.status === "BLOCKED" || values.status === "DELETED")),
    );
    if (!destructive) return update.mutate(values);
    modals.openConfirmModal({
      title: "Подтвердите ограничение доступа",
      children: <Text size="sm">Изменение может немедленно лишить пользователя доступа к приложению.</Text>,
      labels: { confirm: "Подтвердить", cancel: "Отмена" },
      confirmProps: { color: "red" },
      onConfirm: () => update.mutate(values),
    });
  };

  const runAdjustment = (values: CreditAdjustmentValues) => {
    const resolved = resolveCreditAdjustmentAttempt(adjustmentAttempt, values);
    setAdjustmentAttempt(resolved.attempt);
    adjust.mutate(resolved);
  };

  const submitAdjustment = (values: CreditAdjustmentValues) => {
    if (!Number.isInteger(values.amount) || values.amount === 0 || values.reason.trim().length < 3) return;
    if (values.amount > 0) return runAdjustment(values);
    modals.openConfirmModal({
      title: "Подтвердите списание",
      children: <Text size="sm">Будет списано {formatNumber(Math.abs(values.amount))} кредитов.</Text>,
      labels: { confirm: "Списать", cancel: "Отмена" },
      confirmProps: { color: "red" },
      onConfirm: () => runAdjustment(values),
    });
  };

  return (
    <PageFrame
      title={user.data?.account ?? "Пользователь"}
      description="Профиль, доступ и кредитный баланс"
      actions={<Anchor component={Link} to="/users">← Все пользователи</Anchor>}
    >
      <AsyncState loading={user.isLoading} error={user.isError} onRetry={() => void user.refetch()}>
        {user.data ? (
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, md: 3 }}>
              <Card withBorder><Text size="sm" c="dimmed">Статус</Text><Group mt="sm"><EnumBadge value={user.data.status} labels={statusLabels} colors={statusColors} /><EnumBadge value={user.data.role} labels={roleLabels} /></Group></Card>
              <Card withBorder><Text size="sm" c="dimmed">Баланс</Text><Text fz={26} fw={700} mt="sm">{formatNumber(user.data.balance)} кр.</Text></Card>
              <Card withBorder><Text size="sm" c="dimmed">Активность</Text><Text fw={600} mt="sm">{formatDateTime(user.data.lastLoginAt)}</Text></Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 2 }}>
              <Card withBorder>
                <Title order={2}>Настройки аккаунта</Title>
                <Text c="dimmed" size="sm" mt={4}>{user.data.email ?? user.data.phone ?? user.data.id}</Text>
                <form onSubmit={form.onSubmit(submitUser)}>
                  <Stack mt="lg">
                    <Select label="Роль" data={Object.entries(roleLabels).map(([value, label]) => ({ value, label }))} allowDeselect={false} {...form.getInputProps("role")} />
                    <Select label="Статус" data={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} allowDeselect={false} {...form.getInputProps("status")} />
                    <Button type="submit" loading={update.isPending} disabled={!form.isDirty()}>Сохранить изменения</Button>
                  </Stack>
                </form>
              </Card>

              <Card withBorder>
                <Title order={2}>Корректировка баланса</Title>
                <Text c="dimmed" size="sm" mt={4}>UUID сохраняется только при retry той же операции; изменение суммы или причины создаёт новую.</Text>
                <form onSubmit={adjustment.onSubmit(submitAdjustment)}>
                  <Stack mt="lg">
                    <NumberInput label="Кредиты" description="Плюс — начисление, минус — списание" allowDecimal={false} min={-100000} max={100000} {...adjustment.getInputProps("amount")} />
                    <Textarea label="Причина" minRows={3} {...adjustment.getInputProps("reason")} />
                    <Button type="submit" loading={adjust.isPending}>Изменить баланс</Button>
                  </Stack>
                </form>
              </Card>
            </SimpleGrid>

            <Card withBorder>
              <Title order={2}>Сводка</Title>
              <SimpleGrid cols={{ base: 2, sm: 4 }} mt="lg">
                <div><Text size="xs" c="dimmed">Проекты</Text><Text fw={700}>{user.data.counts.projects}</Text></div>
                <div><Text size="xs" c="dimmed">Генерации</Text><Text fw={700}>{user.data.counts.generations}</Text></div>
                <div><Text size="xs" c="dimmed">Заказы</Text><Text fw={700}>{user.data.counts.paymentOrders}</Text></div>
                <div><Text size="xs" c="dimmed">Часовой пояс</Text><Text fw={700}>{user.data.timezone}</Text></div>
              </SimpleGrid>
            </Card>
          </Stack>
        ) : null}
      </AsyncState>
    </PageFrame>
  );
}
