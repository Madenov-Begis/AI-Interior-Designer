import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Switch,
  Text,
  Textarea as RoomPromptField,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconHomePlus, IconPower } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi, type AdminApiError, type RoomType } from "@/shared/api";
import { formatDateTime } from "@/shared/lib";
import {
  AsyncState,
  PageFrame,
  ResourceTable,
  type ResourceColumn,
} from "@/shared/ui";

type RoomValues = {
  code: string;
  name: string;
  promptModifier: string;
  active: boolean;
  sortOrder: number;
};

const emptyValues: RoomValues = {
  code: "",
  name: "",
  promptModifier: "",
  active: true,
  sortOrder: 0,
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Не удалось сохранить комнату";
}

function RoomForm({
  item,
  onClose,
}: {
  item: RoomType | null;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const form = useForm<RoomValues>({
    initialValues: item
      ? {
          code: item.code,
          name: item.name,
          promptModifier: item.promptModifier,
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
        value.trim().length >= 2 ? null : "Введите название комнаты",
      promptModifier: (value) =>
        value.trim().length >= 10
          ? null
          : "Введите AI-инструкцию длиной не менее 10 символов",
    },
  });
  const save = useMutation({
    mutationFn: (values: RoomValues) => {
      const payload = {
        ...(item ? {} : { code: values.code }),
        name: values.name.trim(),
        promptModifier: values.promptModifier.trim(),
        active: values.active,
        sortOrder: values.sortOrder,
      };
      return adminApi<RoomType>(
        item ? `/api/v1/admin/rooms/${item.id}` : "/api/v1/admin/rooms",
        {
          method: item ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        message: item ? "Комната обновлена" : "Комната создана",
      });
      await client.invalidateQueries({ queryKey: ["admin", "rooms"] });
      onClose();
    },
  });

  return (
    <form noValidate onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="md">
        {save.isError ? (
          <Alert color="red" title="Изменения не сохранены">
            {errorMessage(save.error as AdminApiError)}
          </Alert>
        ) : null}
        <TextInput
          label="Код"
          description={
            item
              ? "Код нельзя изменить после создания"
              : "Используется в API и snapshot генерации"
          }
          placeholder="living-room"
          disabled={Boolean(item)}
          required
          maxLength={32}
          {...form.getInputProps("code")}
        />
        <TextInput
          label="Название"
          placeholder="Гостиная"
          required
          maxLength={80}
          {...form.getInputProps("name")}
        />
        <RoomPromptField
          label="Инструкция для AI"
          description="Добавляется к пользовательскому заданию только на сервере"
          placeholder="Опишите назначение, функциональные зоны и требования к эргономике"
          required
          minRows={5}
          maxRows={12}
          autosize
          styles={{ input: { resize: "none" } }}
          maxLength={2000}
          {...form.getInputProps("promptModifier")}
        />
        <NumberInput
          label="Порядок"
          description="Меньшее число отображается раньше"
          min={-10_000}
          max={10_000}
          allowDecimal={false}
          {...form.getInputProps("sortOrder")}
        />
        <Switch
          label="Активна и доступна для новых генераций"
          {...form.getInputProps("active", { type: "checkbox" })}
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose} disabled={save.isPending}>
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

export function RoomsPage() {
  const client = useQueryClient();
  const [dialog, setDialog] = useState<RoomType | null | undefined>();
  const [deactivating, setDeactivating] = useState<RoomType | null>(null);
  const query = useQuery({
    queryKey: ["admin", "rooms"],
    queryFn: () => adminApi<{ items: RoomType[] }>("/api/v1/admin/rooms"),
  });
  const deactivate = useMutation({
    mutationFn: (id: string) =>
      adminApi<RoomType>(`/api/v1/admin/rooms/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Комната отключена" });
      await client.invalidateQueries({ queryKey: ["admin", "rooms"] });
      setDeactivating(null);
    },
  });
  const columns: Array<ResourceColumn<RoomType>> = [
    {
      key: "room",
      label: "Комната",
      render: (item) => (
        <Stack gap={1}>
          <Text fw={700}>{item.name}</Text>
          <Text size="xs" c="dimmed">
            {item.code}
          </Text>
        </Stack>
      ),
    },
    {
      key: "prompt",
      label: "Инструкция для AI",
      render: (item) => (
        <Text size="sm" lineClamp={2} maw={520} title={item.promptModifier}>
          {item.promptModifier}
        </Text>
      ),
    },
    {
      key: "status",
      label: "Статус",
      render: (item) => (
        <Badge color={item.active ? "green" : "gray"} variant="light">
          {item.active ? "Активна" : "Отключена"}
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
      label: "Изменена",
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
          {item.active ? (
            <Tooltip label="Отключить">
              <ActionIcon
                size={44}
                variant="subtle"
                color="orange"
                aria-label={`Отключить ${item.name}`}
                onClick={() => setDeactivating(item)}
              >
                <IconPower size={19} />
              </ActionIcon>
            </Tooltip>
          ) : null}
        </Group>
      ),
    },
  ];

  return (
    <PageFrame
      title="Комнаты"
      description="Названия и серверные AI-инструкции для новых генераций"
      actions={
        <Button
          leftSection={<IconHomePlus size={18} />}
          onClick={() => setDialog(null)}
        >
          Создать комнату
        </Button>
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
        title={dialog ? `Редактирование: ${dialog.name}` : "Новая комната"}
        size="lg"
        centered
      >
        {dialog !== undefined ? (
          <RoomForm
            key={dialog?.id ?? "new"}
            item={dialog}
            onClose={() => setDialog(undefined)}
          />
        ) : null}
      </Modal>
      <Modal
        opened={Boolean(deactivating)}
        onClose={() => {
          if (!deactivate.isPending) setDeactivating(null);
        }}
        title="Отключить комнату?"
        centered
      >
        <Stack>
          <Text size="sm">
            «{deactivating?.name}» исчезнет из выбора для новых генераций.
            Существующие результаты и доработки сохранят её snapshot.
          </Text>
          {deactivate.isError ? (
            <Alert color="red" title="Комната не отключена">
              {errorMessage(deactivate.error)}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setDeactivating(null)}
              disabled={deactivate.isPending}
            >
              Назад
            </Button>
            <Button
              color="orange"
              loading={deactivate.isPending}
              onClick={() => {
                if (deactivating) deactivate.mutate(deactivating.id);
              }}
            >
              Отключить
            </Button>
          </Group>
        </Stack>
      </Modal>
    </PageFrame>
  );
}
