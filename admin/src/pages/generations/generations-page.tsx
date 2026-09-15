import { ActionIcon, Anchor, Group, Select, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconPlayerStop } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi, queryString, type AdminGeneration, type GenerationStatus, type Paged } from "@/shared/api";
import { formatDateTime, formatDuration, toApiDate } from "@/shared/lib";
import { AsyncState, EnumBadge, PageFrame, PagePagination, ResourceTable, type ResourceColumn } from "@/shared/ui";

const statusLabels: Record<GenerationStatus, string> = {
  QUEUED: "В очереди", PROCESSING: "Обрабатывается", SUCCEEDED: "Успешно",
  FAILED: "Ошибка", CANCELLED: "Отменена", REJECTED: "Отклонена",
};
const statusColors = { QUEUED: "yellow", PROCESSING: "blue", SUCCEEDED: "green", FAILED: "red", CANCELLED: "gray", REJECTED: "orange" };

export function GenerationsPage() {
  const [params, setParams] = useSearchParams();
  const client = useQueryClient();
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setParams(next);
  };
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = [25, 50, 100].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 25;
  const deferredQuery = useDeferredValue(params.get("query") ?? "");
  const path = `/api/v1/admin/generations${queryString({
    page, pageSize,
    query: deferredQuery, status: params.get("status"),
    userId: params.get("userId"), projectId: params.get("projectId"),
    from: toApiDate(params.get("from") ?? ""), to: toApiDate(params.get("to") ?? "", true),
  })}`;
  const query = useQuery({ queryKey: ["admin", "generations", path], queryFn: () => adminApi<Paged<AdminGeneration>>(path) });
  const cancel = useMutation({
    mutationFn: (id: string) => adminApi(`/api/v1/admin/generations/${id}/cancel`, { method: "POST" }),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Генерация отменена" });
      await client.invalidateQueries({ queryKey: ["admin", "generations"] });
    },
  });
  const confirmCancel = (item: AdminGeneration) => modals.openConfirmModal({
    title: "Отменить генерацию?",
    children: <Text size="sm">Зарезервированные кредиты будут возвращены по правилам генерации.</Text>,
    labels: { confirm: "Отменить генерацию", cancel: "Назад" }, confirmProps: { color: "red" },
    onConfirm: () => cancel.mutate(item.id),
  });
  const columns: Array<ResourceColumn<AdminGeneration>> = [
    { key: "id", label: "ID", render: (item) => <Stack gap={1}><Anchor component={Link} to={`/generations/${item.id}`} fw={600}>{item.id.slice(0, 8)}…</Anchor><Text size="xs" c="dimmed">{formatDateTime(item.createdAt)}</Text></Stack> },
    { key: "user", label: "Пользователь", render: (item) => <Anchor component={Link} to={`/users/${item.user.id}`}>{item.user.account}</Anchor> },
    { key: "project", label: "Проект", render: (item) => item.project.name },
    { key: "room", label: "Комната", render: (item) => item.room?.name ?? "—", mobile: false },
    { key: "status", label: "Статус", render: (item) => <EnumBadge value={item.status} labels={statusLabels} colors={statusColors} /> },
    { key: "cost", label: "Стоимость", render: (item) => item.estimatedCost ?? "—", mobile: false },
    { key: "duration", label: "Длительность", render: (item) => formatDuration(item.durationMs), mobile: false },
    { key: "attempts", label: "Попытки", render: (item) => item.attemptCount, mobile: false },
    { key: "action", label: "", render: (item) => item.canCancel ? <Tooltip label="Отменить"><ActionIcon size={44} color="red" variant="subtle" aria-label={`Отменить генерацию ${item.id}`} onClick={() => confirmCancel(item)} loading={cancel.isPending}><IconPlayerStop size={18} /></ActionIcon></Tooltip> : null },
  ];
  return (
    <PageFrame title="Генерации" description="Очередь, результаты, ошибки, стоимость и попытки">
      <Group align="flex-end" gap="sm">
        <TextInput label="Поиск" placeholder="ID, пользователь, проект, prompt" value={params.get("query") ?? ""} onChange={(event) => update("query", event.currentTarget.value)} flex="1 1 280px" />
        <Select label="Статус" placeholder="Все" clearable value={params.get("status")} onChange={(value) => update("status", value ?? "")} data={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} w={190} />
        <TextInput label="От" type="date" value={params.get("from") ?? ""} onChange={(event) => update("from", event.currentTarget.value)} />
        <TextInput label="До" type="date" value={params.get("to") ?? ""} onChange={(event) => update("to", event.currentTarget.value)} />
      </Group>
      <Group grow align="flex-end">
        <TextInput label="User ID" placeholder="UUID пользователя" value={params.get("userId") ?? ""} onChange={(event) => update("userId", event.currentTarget.value)} />
        <TextInput label="Project ID" placeholder="UUID проекта" value={params.get("projectId") ?? ""} onChange={(event) => update("projectId", event.currentTarget.value)} />
      </Group>
      <AsyncState loading={query.isLoading} error={query.isError} empty={query.data?.items.length === 0} onRetry={() => void query.refetch()}>
        {query.data ? <ResourceTable items={query.data.items} columns={columns} getKey={(item) => item.id} /> : null}
      </AsyncState>
      {query.data ? <PagePagination pageInfo={query.data.pageInfo} onPage={(value) => update("page", String(value))} onPageSize={(value) => update("pageSize", String(value))} /> : null}
    </PageFrame>
  );
}
