import { Alert, Button, Center, Loader, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconInbox } from "@tabler/icons-react";
import type { ReactNode } from "react";

export function AsyncState({
  loading,
  error,
  empty,
  onRetry,
  children,
}: {
  loading: boolean;
  error: boolean;
  empty?: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <Center mih={280} aria-label="Загрузка">
        <Loader />
      </Center>
    );
  if (error)
    return (
      <Alert color="red" icon={<IconAlertCircle size={20} />} title="Не удалось загрузить данные">
        <Stack align="flex-start" gap="sm">
          <Text size="sm">Проверьте подключение и повторите запрос.</Text>
          <Button variant="light" color="red" onClick={onRetry}>Повторить</Button>
        </Stack>
      </Alert>
    );
  if (empty)
    return (
      <Center mih={240}>
        <Stack align="center" gap="xs">
          <IconInbox size={32} color="var(--mantine-color-dimmed)" />
          <Text c="dimmed">По выбранным условиям данных нет</Text>
        </Stack>
      </Center>
    );
  return children;
}
