import { Anchor, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi, queryString, type Paged, type PaymentOrder } from "@/shared/api";
import { formatDateTime, formatNumber, formatUzs, toApiDate } from "@/shared/lib";
import { AsyncState, EnumBadge, PageFrame, PagePagination, ResourceTable, type ResourceColumn } from "@/shared/ui";

const statusLabels = { PENDING: "Ожидает", PAID: "Оплачен", FAILED: "Ошибка", CANCELLED: "Отменён", EXPIRED: "Истёк" };
const statusColors = { PENDING: "yellow", PAID: "green", FAILED: "red", CANCELLED: "gray", EXPIRED: "orange" };

export function PaymentOrdersPage() {
  const [params, setParams] = useSearchParams();
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== "page") next.set("page", "1"); setParams(next); };
  const page = Math.max(1, Number(params.get("page")) || 1); const pageSize = [25, 50, 100].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 25;
  const deferredQuery = useDeferredValue(params.get("query") ?? "");
  const path = `/api/v1/admin/payment-orders${queryString({ page, pageSize, query: deferredQuery, status: params.get("status"), provider: params.get("provider"), from: toApiDate(params.get("from") ?? ""), to: toApiDate(params.get("to") ?? "", true) })}`;
  const query = useQuery({ queryKey: ["admin", "payment-orders", path], queryFn: () => adminApi<Paged<PaymentOrder>>(path) });
  const columns: Array<ResourceColumn<PaymentOrder>> = [
    { key: "user", label: "Пользователь", render: (item) => <Anchor component={Link} to={`/users/${item.user.id}`}>{item.user.account}</Anchor> },
    { key: "package", label: "Пакет", render: (item) => <Stack gap={1}><Text fw={600}>{item.packageName}</Text><Text size="xs" c="dimmed">{item.packageCode} · {formatNumber(item.credits)} кр.</Text></Stack> },
    { key: "amount", label: "Сумма", render: (item) => formatUzs(item.amountUzs) },
    { key: "provider", label: "Провайдер", render: (item) => item.provider },
    { key: "status", label: "Статус", render: (item) => <EnumBadge value={item.status} labels={statusLabels} colors={statusColors} /> },
    { key: "created", label: "Создан", render: (item) => formatDateTime(item.createdAt), mobile: false },
  ];
  return (
    <PageFrame title="Платёжные заказы" description="Оплаты пакетов кредитов" actions={<Group><Anchor component={Link} to="/finance/orders" fw={700}>Платежи</Anchor><Anchor component={Link} to="/finance/transactions">Операции</Anchor><Anchor component={Link} to="/finance/packages">Пакеты</Anchor></Group>}>
      <Group align="flex-end" gap="sm">
        <TextInput label="Поиск" placeholder="ID, пакет, пользователь" value={params.get("query") ?? ""} onChange={(event) => update("query", event.currentTarget.value)} flex="1 1 260px" />
        <Select label="Статус" placeholder="Все" clearable value={params.get("status")} onChange={(value) => update("status", value ?? "")} data={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} w={170} />
        <Select label="Провайдер" placeholder="Все" clearable value={params.get("provider")} onChange={(value) => update("provider", value ?? "")} data={["MOCK", "PAYME", "CLICK"]} w={150} />
        <TextInput label="От" type="date" value={params.get("from") ?? ""} onChange={(event) => update("from", event.currentTarget.value)} />
        <TextInput label="До" type="date" value={params.get("to") ?? ""} onChange={(event) => update("to", event.currentTarget.value)} />
      </Group>
      <AsyncState loading={query.isLoading} error={query.isError} empty={query.data?.items.length === 0} onRetry={() => void query.refetch()}>{query.data ? <ResourceTable items={query.data.items} columns={columns} getKey={(item) => item.id} /> : null}</AsyncState>
      {query.data ? <PagePagination pageInfo={query.data.pageInfo} onPage={(value) => update("page", String(value))} onPageSize={(value) => update("pageSize", String(value))} /> : null}
    </PageFrame>
  );
}
