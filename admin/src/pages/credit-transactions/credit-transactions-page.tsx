import { Anchor, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi, queryString, type CreditTransaction, type Paged } from "@/shared/api";
import { formatDateTime, formatNumber, shortId, toApiDate } from "@/shared/lib";
import { AsyncState, PageFrame, PagePagination, ResourceTable, type ResourceColumn } from "@/shared/ui";

const kindLabels: Record<string, string> = {
  SIGNUP_GRANT: "Стартовое начисление",
  PURCHASE: "Покупка",
  GENERATION_DEBIT: "Списание за генерацию",
  TECHNICAL_REFUND: "Технический возврат",
  CANCELLATION_REFUND: "Возврат при отмене",
  ADMIN_ADJUSTMENT: "Корректировка администратора",
};

export function CreditTransactionsPage() {
  const [params, setParams] = useSearchParams();
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== "page") next.set("page", "1"); setParams(next); };
  const page = Math.max(1, Number(params.get("page")) || 1); const pageSize = [25, 50, 100].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 25;
  const deferredQuery = useDeferredValue(params.get("query") ?? "");
  const path = `/api/v1/admin/credit-transactions${queryString({ page, pageSize, query: deferredQuery, kind: params.get("kind"), userId: params.get("userId"), from: toApiDate(params.get("from") ?? ""), to: toApiDate(params.get("to") ?? "", true) })}`;
  const query = useQuery({ queryKey: ["admin", "credit-transactions", path], queryFn: () => adminApi<Paged<CreditTransaction>>(path) });
  const columns: Array<ResourceColumn<CreditTransaction>> = [
    { key: "user", label: "Пользователь", render: (item) => <Anchor component={Link} to={`/users/${item.user.id}`}>{item.user.account}</Anchor> },
    { key: "kind", label: "Тип", render: (item) => kindLabels[item.kind] ?? item.kind },
    { key: "amount", label: "Операция", render: (item) => <Text fw={700} c={item.amount > 0 ? "green" : "red"}>{item.amount > 0 ? "+" : ""}{formatNumber(item.amount)} кр.</Text> },
    { key: "balance", label: "Баланс после", render: (item) => `${formatNumber(item.balanceAfter)} кр.` },
    { key: "links", label: "Связи", render: (item) => <Stack gap={1}>{item.generationId ? <Anchor component={Link} to={`/generations/${item.generationId}`} size="xs">Генерация {shortId(item.generationId)}</Anchor> : null}{item.orderId ? <Text size="xs">Заказ {shortId(item.orderId)}</Text> : null}{!item.orderId && !item.generationId ? "—" : null}</Stack>, mobile: false },
    { key: "reason", label: "Причина", render: (item) => item.reason ?? "—", mobile: false },
    { key: "created", label: "Дата", render: (item) => formatDateTime(item.createdAt), mobile: false },
  ];
  return (
    <PageFrame title="Кредитные операции" description="Все начисления, списания и возвраты" actions={<Group><Anchor component={Link} to="/finance/orders">Платежи</Anchor><Anchor component={Link} to="/finance/transactions" fw={700}>Операции</Anchor></Group>}>
      <Group align="flex-end" gap="sm">
        <TextInput label="Поиск" placeholder="Причина или пользователь" value={params.get("query") ?? ""} onChange={(event) => update("query", event.currentTarget.value)} flex="1 1 260px" />
        <Select label="Тип" placeholder="Все" searchable clearable value={params.get("kind")} onChange={(value) => update("kind", value ?? "")} data={Object.entries(kindLabels).map(([value, label]) => ({ value, label }))} w={250} />
        <TextInput label="User ID" placeholder="UUID" value={params.get("userId") ?? ""} onChange={(event) => update("userId", event.currentTarget.value)} />
        <TextInput label="От" type="date" value={params.get("from") ?? ""} onChange={(event) => update("from", event.currentTarget.value)} />
        <TextInput label="До" type="date" value={params.get("to") ?? ""} onChange={(event) => update("to", event.currentTarget.value)} />
      </Group>
      <AsyncState loading={query.isLoading} error={query.isError} empty={query.data?.items.length === 0} onRetry={() => void query.refetch()}>{query.data ? <ResourceTable items={query.data.items} columns={columns} getKey={(item) => item.id} /> : null}</AsyncState>
      {query.data ? <PagePagination pageInfo={query.data.pageInfo} onPage={(value) => update("page", String(value))} onPageSize={(value) => update("pageSize", String(value))} /> : null}
    </PageFrame>
  );
}
