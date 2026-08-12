import { Anchor, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  adminApi,
  queryString,
  type AdminUser,
  type Paged,
} from "@/shared/api";
import { formatDate, formatNumber } from "@/shared/lib";
import {
  AdminUserActions,
  AsyncState,
  EnumBadge,
  PageFrame,
  PagePagination,
  ResourceTable,
  type ResourceColumn,
} from "@/shared/ui";

const roleLabels = { USER: "Пользователь", ADMIN: "Администратор" };
const statusLabels = {
  ACTIVE: "Активен",
  BLOCKED: "Заблокирован",
  DELETED: "Удалён",
};
const statusColors = { ACTIVE: "green", BLOCKED: "red", DELETED: "gray" };

export function UsersPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = [25, 50, 100].includes(Number(params.get("pageSize")))
    ? Number(params.get("pageSize"))
    : 25;
  const deferredQuery = useDeferredValue(params.get("query") ?? "");
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setParams(next);
  };
  const path = `/api/v1/admin/users${queryString({
    page,
    pageSize,
    query: deferredQuery,
    role: params.get("role"),
    status: params.get("status"),
  })}`;
  const users = useQuery({
    queryKey: ["admin", "users", path],
    queryFn: () => adminApi<Paged<AdminUser>>(path),
  });
  const columns: Array<ResourceColumn<AdminUser>> = [
    {
      key: "account",
      label: "Пользователь",
      render: (user) => (
        <Stack gap={1}>
          <Anchor component={Link} to={`/users/${user.id}`} fw={600}>
            {user.account}
          </Anchor>
          <Text size="xs" c="dimmed">
            {user.phone ?? user.email ?? "—"}
          </Text>
        </Stack>
      ),
    },
    {
      key: "role",
      label: "Роль",
      render: (user) => <EnumBadge value={user.role} labels={roleLabels} />,
    },
    {
      key: "balance",
      label: "Баланс",
      render: (user) => `${formatNumber(user.balance)} кр.`,
    },
    {
      key: "status",
      label: "Статус",
      render: (user) => (
        <EnumBadge
          value={user.status}
          labels={statusLabels}
          colors={statusColors}
        />
      ),
    },
    {
      key: "created",
      label: "Регистрация",
      render: (user) => formatDate(user.createdAt),
      mobile: false,
    },
    {
      key: "actions",
      label: "Действия",
      render: (user) => <AdminUserActions user={user} />,
    },
  ];
  return (
    <PageFrame
      title="Пользователи"
      description="Аккаунты, доступ и кредитный баланс"
    >
      <Group align="flex-end" gap="sm">
        <TextInput
          label="Поиск"
          placeholder="Имя, email или телефон"
          value={params.get("query") ?? ""}
          onChange={(event) => update("query", event.currentTarget.value)}
          flex="1 1 260px"
        />
        <Select
          label="Роль"
          placeholder="Все"
          clearable
          value={params.get("role")}
          onChange={(value) => update("role", value ?? "")}
          data={[
            { value: "USER", label: "Пользователь" },
            { value: "ADMIN", label: "Администратор" },
          ]}
          w={180}
        />
        <Select
          label="Статус"
          placeholder="Все"
          clearable
          value={params.get("status")}
          onChange={(value) => update("status", value ?? "")}
          data={Object.entries(statusLabels).map(([value, label]) => ({
            value,
            label,
          }))}
          w={190}
        />
      </Group>
      <AsyncState
        loading={users.isLoading}
        error={users.isError}
        empty={users.data?.items.length === 0}
        onRetry={() => void users.refetch()}
      >
        {users.data ? (
          <ResourceTable
            items={users.data.items}
            columns={columns}
            getKey={(user) => user.id}
          />
        ) : null}
      </AsyncState>
      {users.data ? (
        <PagePagination
          pageInfo={users.data.pageInfo}
          onPage={(value) => update("page", String(value))}
          onPageSize={(value) => update("pageSize", String(value))}
        />
      ) : null}
    </PageFrame>
  );
}
