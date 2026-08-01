import { Button, Group, Select } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useSearchParams } from "react-router-dom";
import { adminApi } from "../shared/api";
import { useAdminQuery, type ListResponse } from "../entities/admin/hooks";
import { PageFrame } from "../widgets/page-frame";
import { ResourceTable } from "../widgets/resource-table";

type Generation = {
  id: string;
  status: string;
  createdAt: string;
  user: { email: string | null; displayName: string | null };
  project: { name: string };
  model: { name: string };
  durationMs: number | null;
  errorMessage: string | null;
};
export function GenerationsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const client = useQueryClient();
  const generations = useAdminQuery<ListResponse<Generation>>(
    ["generations", status],
    `/api/v1/admin/generations?limit=30${status ? `&status=${status}` : ""}`,
  );
  const cancel = useMutation({
    mutationFn: (id: string) =>
      adminApi(`/api/v1/admin/generations/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      notifications.show({ color: "green", message: "Генерация отменена" });
      client.invalidateQueries({ queryKey: ["generations"] });
    },
  });
  const rows = (generations.data?.items ?? []).map((item) => [
    item.user.displayName ?? item.user.email ?? "—",
    item.project.name,
    item.model.name,
    item.status,
    new Date(item.createdAt).toLocaleString("ru-RU"),
    item.status === "QUEUED" ? (
      <Button
        key="cancel"
        size="xs"
        color="red"
        variant="light"
        loading={cancel.isPending}
        onClick={() => cancel.mutate(item.id)}
      >
        Отменить
      </Button>
    ) : (
      "—"
    ),
  ]);
  return (
    <PageFrame
      title="Генерации"
      description="Очередь, результаты, ошибки и стоимость"
      actions={
        <Select
          w={180}
          placeholder="Все статусы"
          value={status}
          onChange={(value) => setParams(value ? { status: value } : {})}
          data={[
            "QUEUED",
            "PROCESSING",
            "SUCCEEDED",
            "FAILED",
            "CANCELLED",
            "REJECTED",
          ]}
          clearable
        />
      }
    >
      <ResourceTable
        loading={generations.isLoading}
        headers={[
          "Пользователь",
          "Проект",
          "Модель",
          "Статус",
          "Создана",
          "Действия",
        ]}
        rows={rows}
      />
    </PageFrame>
  );
}
