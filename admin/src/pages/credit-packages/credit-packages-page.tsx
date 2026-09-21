import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, type CreditPackage } from "@/shared/api";
import { formatDateTime, formatNumber, formatUzs } from "@/shared/lib";
import {
  AsyncState,
  PageFrame,
  ResourceTable,
  type ResourceColumn,
} from "@/shared/ui";

type PackageValues = {
  code: string;
  name: string;
  nameEn: string;
  nameUz: string;
  description: string;
  descriptionEn: string;
  descriptionUz: string;
  credits: number;
  priceUzs: number;
  popular: boolean;
  active: boolean;
  sortOrder: number;
};

const emptyValues: PackageValues = {
  code: "",
  name: "",
  nameEn: "",
  nameUz: "",
  description: "",
  descriptionEn: "",
  descriptionUz: "",
  credits: 20,
  priceUzs: 25_000,
  popular: false,
  active: true,
  sortOrder: 0,
};

function PackageForm({
  item,
  onClose,
}: {
  item: CreditPackage | null;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const form = useForm<PackageValues>({
    initialValues: item
      ? {
          code: item.code,
          name: item.name,
          nameEn: item.nameEn ?? "",
          nameUz: item.nameUz ?? "",
          description: item.description ?? "",
          descriptionEn: item.descriptionEn ?? "",
          descriptionUz: item.descriptionUz ?? "",
          credits: item.credits,
          priceUzs: item.priceUzs,
          popular: item.popular,
          active: item.active,
          sortOrder: item.sortOrder,
        }
      : emptyValues,
    validate: {
      code: (value) =>
        /^[a-z0-9-]{2,32}$/.test(value)
          ? null
          : "2–32 символа: строчные буквы, цифры и дефис",
      name: (value) =>
        value.trim().length >= 2 ? null : "Введите название пакета",
      nameEn: (value) =>
        value.trim().length >= 2
          ? null
          : "Введите название пакета на английском",
      credits: (value) =>
        Number.isInteger(value) && value > 0
          ? null
          : "Укажите целое количество кредитов",
      priceUzs: (value) =>
        Number.isInteger(value) && value >= 1_000
          ? null
          : "Минимальная цена — 1 000 сум",
    },
  });
  const save = useMutation({
    mutationFn: (values: PackageValues) => {
      const payload = {
        ...(item ? {} : { code: values.code }),
        name: values.name.trim(),
        nameEn: values.nameEn.trim(),
        nameUz: values.nameUz.trim() || null,
        description: values.description.trim() || null,
        descriptionEn: values.descriptionEn.trim() || null,
        descriptionUz: values.descriptionUz.trim() || null,
        credits: values.credits,
        priceUzs: values.priceUzs,
        popular: values.popular,
        active: values.active,
        sortOrder: values.sortOrder,
      };
      return adminApi<CreditPackage>(
        item
          ? `/api/v1/admin/credit-packages/${item.id}`
          : "/api/v1/admin/credit-packages",
        {
          method: item ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        message: item ? "Пакет обновлён" : "Пакет создан",
      });
      await client.invalidateQueries({
        queryKey: ["admin", "credit-packages"],
      });
      onClose();
    },
  });

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="md">
        <TextInput
          label="Код"
          description={
            item
              ? "Код нельзя изменить после создания"
              : "Используется в API и заказах"
          }
          placeholder="standard"
          disabled={Boolean(item)}
          required
          {...form.getInputProps("code")}
        />
        <TextInput
          label="Название (RU)"
          placeholder="Стандарт"
          required
          {...form.getInputProps("name")}
        />
        <TextInput
          label="Название (EN)"
          placeholder="Standard"
          required
          {...form.getInputProps("nameEn")}
        />
        <TextInput
          label="Название (UZ)"
          description="Fallback — английское название"
          placeholder="Standart"
          {...form.getInputProps("nameUz")}
        />
        <Textarea
          label="Описание (RU)"
          placeholder="Оптимально для ремонта"
          minRows={2}
          {...form.getInputProps("description")}
        />
        <Textarea
          label="Описание (EN)"
          placeholder="Best for renovation"
          minRows={2}
          {...form.getInputProps("descriptionEn")}
        />
        <Textarea
          label="Описание (UZ)"
          description="Fallback — английское описание"
          placeholder="Ta’mirlash uchun maqbul"
          minRows={2}
          {...form.getInputProps("descriptionUz")}
        />
        <Group grow align="flex-start">
          <NumberInput
            label="Кредиты"
            min={1}
            max={1_000_000}
            allowDecimal={false}
            required
            {...form.getInputProps("credits")}
          />
          <NumberInput
            label="Цена, сум"
            min={1_000}
            max={2_000_000_000}
            step={1_000}
            thousandSeparator=" "
            allowDecimal={false}
            required
            {...form.getInputProps("priceUzs")}
          />
        </Group>
        <NumberInput
          label="Порядок"
          description="Меньшее число отображается раньше"
          min={-10_000}
          max={10_000}
          allowDecimal={false}
          {...form.getInputProps("sortOrder")}
        />
        <Switch
          label="Активен и доступен для покупки"
          checked={form.values.active}
          onChange={(event) => {
            const active = event.currentTarget.checked;
            form.setFieldValue("active", active);
            if (!active) form.setFieldValue("popular", false);
          }}
        />
        <Switch
          label="Показывать как «Выбирают чаще»"
          disabled={!form.values.active}
          {...form.getInputProps("popular", { type: "checkbox" })}
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={save.isPending}>
            Сохранить
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function CreditPackagesPage() {
  const client = useQueryClient();
  const [dialog, setDialog] = useState<CreditPackage | null | undefined>();
  const query = useQuery({
    queryKey: ["admin", "credit-packages"],
    queryFn: () =>
      adminApi<{ items: CreditPackage[] }>("/api/v1/admin/credit-packages"),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      adminApi<{ id: string }>(`/api/v1/admin/credit-packages/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Пакет удалён" });
      await client.invalidateQueries({
        queryKey: ["admin", "credit-packages"],
      });
    },
  });
  const confirmDelete = (item: CreditPackage) => {
    modals.openConfirmModal({
      title: "Удалить пакет?",
      children: (
        <Text size="sm">
          «{item.name}» исчезнет из продажи. История уже созданных заказов
          сохранится.
        </Text>
      ),
      labels: { confirm: "Удалить", cancel: "Отмена" },
      confirmProps: { color: "red" },
      onConfirm: () => remove.mutate(item.id),
    });
  };
  const columns: Array<ResourceColumn<CreditPackage>> = [
    {
      key: "package",
      label: "Пакет",
      render: (item) => (
        <Stack gap={1}>
          <Group gap="xs">
            <Text fw={700}>{item.name}</Text>
            {item.popular ? <Badge variant="light">Выбирают чаще</Badge> : null}
          </Group>
          <Text size="xs" c="dimmed">
            {item.code}
            {item.description ? ` · ${item.description}` : ""}
          </Text>
        </Stack>
      ),
    },
    {
      key: "credits",
      label: "Кредиты",
      render: (item) => `${formatNumber(item.credits)} кр.`,
    },
    { key: "price", label: "Цена", render: (item) => formatUzs(item.priceUzs) },
    {
      key: "status",
      label: "Статус",
      render: (item) => (
        <Badge color={item.active ? "green" : "gray"} variant="light">
          {item.active ? "Активен" : "Отключён"}
        </Badge>
      ),
    },
    {
      key: "sort",
      label: "Порядок",
      render: (item) => item.sortOrder,
      mobile: false,
    },
    {
      key: "updated",
      label: "Изменён",
      render: (item) => formatDateTime(item.updatedAt),
      mobile: false,
    },
    {
      key: "actions",
      label: "Действия",
      render: (item) => (
        <Group gap={4} justify="flex-end" wrap="nowrap">
          <Tooltip label="Редактировать">
            <ActionIcon
              size={44}
              variant="subtle"
              aria-label={`Редактировать ${item.name}`}
              onClick={() => setDialog(item)}
            >
              <IconEdit size={19} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Удалить">
            <ActionIcon
              size={44}
              variant="subtle"
              color="red"
              aria-label={`Удалить ${item.name}`}
              onClick={() => confirmDelete(item)}
              loading={remove.isPending && remove.variables === item.id}
            >
              <IconTrash size={19} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ];

  return (
    <PageFrame
      title="Пакеты кредитов"
      description="Цены и объём кредитов, доступные клиентам"
      actions={
        <Group>
          <Button component={Link} to="/finance/orders" variant="subtle">
            Платежи
          </Button>
          <Button component={Link} to="/finance/transactions" variant="subtle">
            Операции
          </Button>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => setDialog(null)}
          >
            Создать пакет
          </Button>
        </Group>
      }
    >
      <AsyncState
        loading={query.isLoading}
        error={query.isError}
        empty={query.data?.items.length === 0}
        onRetry={() => void query.refetch()}
      >
        {query.data ? (
          <ResourceTable
            items={query.data.items}
            columns={columns}
            getKey={(item) => item.id}
          />
        ) : null}
      </AsyncState>
      <Modal
        opened={dialog !== undefined}
        onClose={() => setDialog(undefined)}
        title={dialog ? `Редактирование: ${dialog.name}` : "Новый пакет"}
        size="lg"
        centered
      >
        {dialog !== undefined ? (
          <PackageForm
            key={dialog?.id ?? "new"}
            item={dialog}
            onClose={() => setDialog(undefined)}
          />
        ) : null}
      </Modal>
    </PageFrame>
  );
}
