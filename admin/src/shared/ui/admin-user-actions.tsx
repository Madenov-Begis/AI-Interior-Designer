import {
  ActionIcon,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCoins, IconEdit, IconEye } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  adminApi,
  type AdminUser,
  type AdminUserDetail,
  type UserRole,
  type UserStatus,
} from "@/shared/api";
import {
  formatNumber,
  resolveCreditAdjustmentAttempt,
  type CreditAdjustmentAttempt,
  type CreditAdjustmentValues,
} from "@/shared/lib";

type UserUpdate = {
  role: UserRole;
  status: UserStatus;
};

type AdminUserActionsProps = {
  user: AdminUser;
  mode?: "icons" | "buttons";
  showView?: boolean;
};

const roleOptions = [
  { value: "USER", label: "Пользователь" },
  { value: "ADMIN", label: "Администратор" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Активен" },
  { value: "BLOCKED", label: "Заблокирован" },
  { value: "DELETED", label: "Удалён" },
];

export function AdminUserActions({
  user,
  mode = "icons",
  showView = true,
}: AdminUserActionsProps) {
  const client = useQueryClient();
  const [editOpened, setEditOpened] = useState(false);
  const [balanceOpened, setBalanceOpened] = useState(false);
  const [adjustmentAttempt, setAdjustmentAttempt] =
    useState<CreditAdjustmentAttempt | null>(null);
  const editForm = useForm<UserUpdate>({
    initialValues: { role: user.role, status: user.status },
  });
  const balanceForm = useForm<CreditAdjustmentValues>({
    initialValues: { amount: 0, reason: "" },
    validate: {
      amount: (value) =>
        Number.isInteger(value) && value !== 0
          ? null
          : "Укажите целое число, кроме нуля",
      reason: (value) =>
        value.trim().length >= 3 ? null : "Укажите причину — минимум 3 символа",
    },
  });

  const invalidateUser = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["admin", "users"] }),
      client.invalidateQueries({ queryKey: ["admin", "users", user.id] }),
    ]);
  };

  const update = useMutation({
    mutationFn: (values: UserUpdate) =>
      adminApi<AdminUserDetail>(`/api/v1/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      setEditOpened(false);
      notifications.show({ color: "green", message: "Пользователь обновлён" });
      await invalidateUser();
    },
  });

  const adjust = useMutation({
    mutationFn: ({
      values,
      attempt,
    }: {
      values: CreditAdjustmentValues;
      attempt: CreditAdjustmentAttempt;
    }) =>
      adminApi<{ userId: string; balance: number }>(
        `/api/v1/admin/users/${user.id}/credit-adjustments`,
        {
          method: "POST",
          body: JSON.stringify({
            ...values,
            idempotencyKey: attempt.idempotencyKey,
          }),
        },
      ),
    onSuccess: async (_result, variables) => {
      setBalanceOpened(false);
      balanceForm.reset();
      setAdjustmentAttempt((current) =>
        current?.idempotencyKey === variables.attempt.idempotencyKey
          ? null
          : current,
      );
      notifications.show({ color: "green", message: "Баланс скорректирован" });
      await invalidateUser();
    },
  });

  const openEdit = () => {
    editForm.setValues({ role: user.role, status: user.status });
    editForm.resetDirty({ role: user.role, status: user.status });
    setEditOpened(true);
  };

  const submitUser = (values: UserUpdate) => {
    const destructive =
      (user.role === "ADMIN" && values.role === "USER") ||
      (user.status === "ACTIVE" &&
        (values.status === "BLOCKED" || values.status === "DELETED"));
    if (!destructive) {
      update.mutate(values);
      return;
    }
    modals.openConfirmModal({
      title: "Подтвердите ограничение доступа",
      children: (
        <Text size="sm">
          Изменение может немедленно лишить пользователя доступа к приложению.
        </Text>
      ),
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
    if (values.amount > 0) {
      runAdjustment(values);
      return;
    }
    modals.openConfirmModal({
      title: "Подтвердите списание",
      children: (
        <Text size="sm">
          Будет списано {formatNumber(Math.abs(values.amount))} кредитов.
        </Text>
      ),
      labels: { confirm: "Списать", cancel: "Отмена" },
      confirmProps: { color: "red" },
      onConfirm: () => runAdjustment(values),
    });
  };

  return (
    <>
      <Group
        gap="xs"
        wrap={mode === "icons" ? "nowrap" : "wrap"}
        justify="flex-end"
      >
        {showView ? (
          mode === "icons" ? (
            <Tooltip label="Открыть профиль">
              <ActionIcon
                component={Link}
                to={`/users/${user.id}`}
                variant="subtle"
                size={44}
                aria-label={`Открыть профиль ${user.account}`}
              >
                <IconEye size={20} aria-hidden="true" />
              </ActionIcon>
            </Tooltip>
          ) : (
            <Button
              component={Link}
              to={`/users/${user.id}`}
              variant="default"
              leftSection={<IconEye size={18} />}
            >
              Открыть
            </Button>
          )
        ) : null}
        {mode === "icons" ? (
          <Tooltip label="Редактировать пользователя">
            <ActionIcon
              variant="subtle"
              size={44}
              onClick={openEdit}
              aria-label={`Редактировать ${user.account}`}
            >
              <IconEdit size={20} aria-hidden="true" />
            </ActionIcon>
          </Tooltip>
        ) : (
          <Button
            variant="default"
            leftSection={<IconEdit size={18} />}
            onClick={openEdit}
          >
            Редактировать
          </Button>
        )}
        {mode === "icons" ? (
          <Tooltip label="Изменить баланс">
            <ActionIcon
              variant="subtle"
              size={44}
              onClick={() => setBalanceOpened(true)}
              aria-label={`Изменить баланс ${user.account}`}
            >
              <IconCoins size={20} aria-hidden="true" />
            </ActionIcon>
          </Tooltip>
        ) : (
          <Button
            leftSection={<IconCoins size={18} />}
            onClick={() => setBalanceOpened(true)}
          >
            Изменить баланс
          </Button>
        )}
      </Group>

      <Modal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        title="Редактировать пользователя"
        centered
        closeOnClickOutside={!update.isPending}
        closeOnEscape={!update.isPending}
        closeButtonProps={{
          disabled: update.isPending,
          "aria-label": "Закрыть",
        }}
      >
        <Text c="dimmed" size="sm" mb="lg">
          {user.account}
        </Text>
        <form onSubmit={editForm.onSubmit(submitUser)}>
          <Stack>
            <Select
              label="Роль"
              data={roleOptions}
              allowDeselect={false}
              {...editForm.getInputProps("role")}
            />
            <Select
              label="Статус"
              data={statusOptions}
              allowDeselect={false}
              {...editForm.getInputProps("status")}
            />
            <Group justify="flex-end" mt="sm">
              <Button
                variant="default"
                onClick={() => setEditOpened(false)}
                disabled={update.isPending}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                loading={update.isPending}
                disabled={!editForm.isDirty()}
              >
                Сохранить
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={balanceOpened}
        onClose={() => setBalanceOpened(false)}
        title="Изменить баланс"
        centered
        closeOnClickOutside={!adjust.isPending}
        closeOnEscape={!adjust.isPending}
        closeButtonProps={{
          disabled: adjust.isPending,
          "aria-label": "Закрыть",
        }}
      >
        <Text c="dimmed" size="sm" mb="lg">
          {user.account} · текущий баланс {formatNumber(user.balance)} кр.
        </Text>
        <form onSubmit={balanceForm.onSubmit(submitAdjustment)}>
          <Stack>
            <NumberInput
              label="Кредиты"
              description="Плюс — начисление, минус — списание"
              allowDecimal={false}
              min={-100000}
              max={100000}
              {...balanceForm.getInputProps("amount")}
            />
            <Textarea
              label="Причина"
              minRows={3}
              {...balanceForm.getInputProps("reason")}
            />
            <Group justify="flex-end" mt="sm">
              <Button
                variant="default"
                onClick={() => setBalanceOpened(false)}
                disabled={adjust.isPending}
              >
                Отмена
              </Button>
              <Button type="submit" loading={adjust.isPending}>
                Изменить баланс
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
