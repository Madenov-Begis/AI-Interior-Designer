import { Button, Drawer, NumberInput, SimpleGrid, Stack, Switch, Text, TextInput, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi, type AdminPlan } from "@/shared/api";
import { AsyncState, EnumBadge, PageFrame, ResourceTable, type ResourceColumn } from "@/shared/ui";

type PlanForm = {
  code: string;
  name: string;
  description: string;
  maxParallelGenerations: number;
  maxReferenceImages: number;
  maxReferenceUrls: number;
  maxUploadSizeMb: number;
  maxOutputWidth: number | string;
  maxOutputHeight: number | string;
  priorityProcessing: boolean;
  active: boolean;
  sortOrder: number;
};

const initialValues: PlanForm = {
  code: "", name: "", description: "", maxParallelGenerations: 1,
  maxReferenceImages: 10, maxReferenceUrls: 10, maxUploadSizeMb: 15,
  maxOutputWidth: "", maxOutputHeight: "", priorityProcessing: false, active: true, sortOrder: 0,
};

export function PlansPage() {
  const client = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [selected, setSelected] = useState<AdminPlan | null>(null);
  const query = useQuery({ queryKey: ["admin", "plans"], queryFn: () => adminApi<{ items: AdminPlan[] }>("/api/v1/admin/plans") });
  const form = useForm<PlanForm>({
    initialValues,
    validate: {
      code: (value) => !selected && !/^[A-Za-z0-9_-]{2,40}$/.test(value) ? "2–40 символов: буквы, цифры, _ или -" : null,
      name: (value) => value.trim() ? null : "Введите название",
    },
  });
  const save = useMutation({
    mutationFn: (values: PlanForm) => {
      const payload = {
        ...values,
        description: values.description.trim() || null,
        maxOutputWidth: values.maxOutputWidth === "" ? null : Number(values.maxOutputWidth),
        maxOutputHeight: values.maxOutputHeight === "" ? null : Number(values.maxOutputHeight),
      };
      if (selected) {
        const update = { ...payload, code: undefined };
        return adminApi<AdminPlan>(`/api/v1/admin/plans/${selected.id}`, { method: "PATCH", body: JSON.stringify(update) });
      }
      return adminApi<AdminPlan>("/api/v1/admin/plans", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: async () => {
      notifications.show({ color: "green", message: selected ? "Тариф обновлён" : "Тариф создан" });
      close();
      await client.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
  });
  const edit = (plan: AdminPlan) => {
    setSelected(plan);
    form.setValues({
      code: plan.code, name: plan.name, description: plan.description ?? "",
      maxParallelGenerations: plan.maxParallelGenerations,
      maxReferenceImages: plan.maxReferenceImages,
      maxReferenceUrls: plan.maxReferenceUrls,
      maxUploadSizeMb: plan.maxUploadSizeMb,
      maxOutputWidth: plan.maxOutputWidth ?? "",
      maxOutputHeight: plan.maxOutputHeight ?? "",
      priorityProcessing: plan.priorityProcessing,
      active: plan.active,
      sortOrder: plan.sortOrder,
    });
    open();
  };
  const create = () => { setSelected(null); form.setValues(initialValues); form.resetDirty(); open(); };
  const submit = (values: PlanForm) => {
    if (selected?.active && !values.active) {
      modals.openConfirmModal({
        title: "Деактивировать тариф?",
        children: <Text size="sm">Тариф останется у текущих пользователей, но станет недоступен для новых назначений.</Text>,
        labels: { confirm: "Деактивировать", cancel: "Отмена" }, confirmProps: { color: "red" },
        onConfirm: () => save.mutate(values),
      });
      return;
    }
    save.mutate(values);
  };
  const columns: Array<ResourceColumn<AdminPlan>> = [
    { key: "plan", label: "Тариф", render: (plan) => <Stack gap={1}><Text fw={700}>{plan.name}</Text><Text size="xs" c="dimmed">{plan.code}</Text></Stack> },
    { key: "users", label: "Пользователи", render: (plan) => plan.userCount },
    { key: "parallel", label: "Параллельно", render: (plan) => plan.maxParallelGenerations },
    { key: "references", label: "Референсы", render: (plan) => `${plan.maxReferenceImages} файлов / ${plan.maxReferenceUrls} URL`, mobile: false },
    { key: "priority", label: "Приоритет", render: (plan) => <EnumBadge value={String(plan.priorityProcessing)} labels={{ true: "Да", false: "Нет" }} colors={{ true: "blue", false: "gray" }} />, mobile: false },
    { key: "status", label: "Статус", render: (plan) => <EnumBadge value={String(plan.active)} labels={{ true: "Активен", false: "Неактивен" }} colors={{ true: "green", false: "gray" }} /> },
    { key: "action", label: "", render: (plan) => <Button size="xs" variant="light" onClick={() => edit(plan)}>Изменить</Button> },
  ];
  return (
    <PageFrame title="Тарифы" description="Все реально поддерживаемые лимиты и параметры" actions={<Button onClick={create}>Создать тариф</Button>}>
      <AsyncState loading={query.isLoading} error={query.isError} empty={query.data?.items.length === 0} onRetry={() => void query.refetch()}>{query.data ? <ResourceTable items={query.data.items} columns={columns} getKey={(plan) => plan.id} /> : null}</AsyncState>
      <Drawer opened={opened} onClose={close} title={selected ? `Тариф ${selected.name}` : "Новый тариф"} position="right" size="lg">
        <form onSubmit={form.onSubmit(submit)}>
          <Stack>
            <TextInput label="Код" description={selected ? "Код неизменяем после создания" : "Будет сохранён в uppercase"} disabled={Boolean(selected)} {...form.getInputProps("code")} />
            <TextInput label="Название" {...form.getInputProps("name")} />
            <Textarea label="Описание" minRows={3} {...form.getInputProps("description")} />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <NumberInput label="Параллельные генерации" min={1} max={20} allowDecimal={false} {...form.getInputProps("maxParallelGenerations")} />
              <NumberInput label="Макс. размер файла, МБ" min={1} max={100} allowDecimal={false} {...form.getInputProps("maxUploadSizeMb")} />
              <NumberInput label="Референс-изображения" min={0} max={30} allowDecimal={false} {...form.getInputProps("maxReferenceImages")} />
              <NumberInput label="Референс-URL" min={0} max={30} allowDecimal={false} {...form.getInputProps("maxReferenceUrls")} />
              <NumberInput label="Макс. ширина" placeholder="Без ограничения" min={256} max={8192} allowDecimal={false} {...form.getInputProps("maxOutputWidth")} />
              <NumberInput label="Макс. высота" placeholder="Без ограничения" min={256} max={8192} allowDecimal={false} {...form.getInputProps("maxOutputHeight")} />
              <NumberInput label="Порядок" allowDecimal={false} {...form.getInputProps("sortOrder")} />
            </SimpleGrid>
            <Switch label="Приоритетная обработка" {...form.getInputProps("priorityProcessing", { type: "checkbox" })} />
            <Switch label="Тариф активен" {...form.getInputProps("active", { type: "checkbox" })} />
            <Button type="submit" loading={save.isPending}>{selected ? "Сохранить" : "Создать"}</Button>
          </Stack>
        </form>
      </Drawer>
    </PageFrame>
  );
}
