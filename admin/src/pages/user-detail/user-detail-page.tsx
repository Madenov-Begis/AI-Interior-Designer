import {
  Anchor,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { adminApi, type AdminUserDetail } from "@/shared/api";
import { formatDateTime, formatNumber } from "@/shared/lib";
import {
  AdminUserActions,
  AsyncState,
  EnumBadge,
  PageFrame,
} from "@/shared/ui";

const roleLabels = { USER: "Пользователь", ADMIN: "Администратор" };
const statusLabels = {
  ACTIVE: "Активен",
  BLOCKED: "Заблокирован",
  DELETED: "Удалён",
};
const statusColors = { ACTIVE: "green", BLOCKED: "red", DELETED: "gray" };

export function UserDetailPage() {
  const { id = "" } = useParams();
  const user = useQuery({
    queryKey: ["admin", "users", id],
    queryFn: () => adminApi<AdminUserDetail>(`/api/v1/admin/users/${id}`),
  });

  return (
    <PageFrame
      title={user.data?.account ?? "Пользователь"}
      description="Профиль, доступ и кредитный баланс"
      actions={
        <Group gap="sm">
          <Anchor component={Link} to="/users">
            ← Все пользователи
          </Anchor>
          {user.data ? (
            <AdminUserActions
              user={user.data}
              mode="buttons"
              showView={false}
            />
          ) : null}
        </Group>
      }
    >
      <AsyncState
        loading={user.isLoading}
        error={user.isError}
        onRetry={() => void user.refetch()}
      >
        {user.data ? (
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, md: 3 }}>
              <Card withBorder>
                <Text size="sm" c="dimmed">
                  Статус
                </Text>
                <Group mt="sm">
                  <EnumBadge
                    value={user.data.status}
                    labels={statusLabels}
                    colors={statusColors}
                  />
                  <EnumBadge value={user.data.role} labels={roleLabels} />
                </Group>
              </Card>
              <Card withBorder>
                <Text size="sm" c="dimmed">
                  Баланс
                </Text>
                <Text fz={26} fw={700} mt="sm">
                  {formatNumber(user.data.balance)} кр.
                </Text>
              </Card>
              <Card withBorder>
                <Text size="sm" c="dimmed">
                  Активность
                </Text>
                <Text fw={600} mt="sm">
                  {formatDateTime(user.data.lastLoginAt)}
                </Text>
              </Card>
            </SimpleGrid>

            <Card withBorder>
              <Title order={2}>Сводка</Title>
              <SimpleGrid cols={{ base: 2, sm: 4 }} mt="lg">
                <div>
                  <Text size="xs" c="dimmed">
                    Проекты
                  </Text>
                  <Text fw={700}>{user.data.counts.projects}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Генерации
                  </Text>
                  <Text fw={700}>{user.data.counts.generations}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Заказы
                  </Text>
                  <Text fw={700}>{user.data.counts.paymentOrders}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Часовой пояс
                  </Text>
                  <Text fw={700}>{user.data.timezone}</Text>
                </div>
              </SimpleGrid>
            </Card>
          </Stack>
        ) : null}
      </AsyncState>
    </PageFrame>
  );
}
