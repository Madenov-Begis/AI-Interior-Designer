import { useAdminQuery } from "../entities/admin/hooks";
import { PageFrame } from "../widgets/page-frame";
import { ResourceTable } from "../widgets/resource-table";

type Row = Record<string, unknown>;
const readable = (value: unknown) =>
  value == null
    ? "—"
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

function SimpleList({
  title,
  description,
  path,
  columns,
}: {
  title: string;
  description: string;
  path: string;
  columns: Array<[string, string]>;
}) {
  const query = useAdminQuery<Row[]>([path], path);
  return (
    <PageFrame title={title} description={description}>
      <ResourceTable
        loading={query.isLoading}
        headers={columns.map(([label]) => label)}
        rows={(query.data ?? []).map((item) =>
          columns.map(([, key]) => readable(item[key])),
        )}
      />
    </PageFrame>
  );
}

export const PlansPage = () => (
  <SimpleList
    title="Тарифы"
    description="Лимиты, доступные модели и правила watermark"
    path="/api/v1/admin/plans"
    columns={[
      ["Код", "code"],
      ["Название", "name"],
      ["Лимит/день", "dailyGenerationLimit"],
      ["Пользователи", "_count"],
      ["Активен", "active"],
    ]}
  />
);
export const FinancePage = () => (
  <SimpleList
    title="Финансы"
    description="Платёжные заказы и кредитные операции"
    path="/api/v1/admin/payment-orders"
    columns={[
      ["Пользователь", "user"],
      ["Пакет", "packageName"],
      ["Сумма", "amountUzs"],
      ["Статус", "status"],
      ["Создан", "createdAt"],
    ]}
  />
);
