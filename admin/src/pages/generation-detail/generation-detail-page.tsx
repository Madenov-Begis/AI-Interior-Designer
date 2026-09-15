import { Anchor, Button, Card, Code, Group, Image, SimpleGrid, Stack, Text, Timeline, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { adminApi, type AdminGenerationDetail, type GenerationStatus, type MediaMetadata } from "@/shared/api";
import { formatBytes, formatDateTime, formatDuration } from "@/shared/lib";
import { AsyncState, EnumBadge, PageFrame } from "@/shared/ui";

const statusLabels: Record<GenerationStatus, string> = { QUEUED: "В очереди", PROCESSING: "Обрабатывается", SUCCEEDED: "Успешно", FAILED: "Ошибка", CANCELLED: "Отменена", REJECTED: "Отклонена" };
const statusColors = { QUEUED: "yellow", PROCESSING: "blue", SUCCEEDED: "green", FAILED: "red", CANCELLED: "gray", REJECTED: "orange" };
const usageStatusLabels = { RESERVED: "Зарезервировано", CONSUMED: "Списано", REFUNDED: "Возвращено", EXPIRED: "Истекло" } as const;

function usageStatusLabel(status: string) {
  return status in usageStatusLabels
    ? usageStatusLabels[status as keyof typeof usageStatusLabels]
    : status;
}

function MediaCard({ file }: { file: MediaMetadata & { position?: number } }) {
  const signed = useQuery({
    queryKey: ["admin", "media", file.id],
    queryFn: () => adminApi<{ url: string; expiresIn: number }>(`/api/v1/admin/media/${file.id}/signed-url`),
    staleTime: 240_000,
  });
  return (
    <Card withBorder padding="sm">
      {file.mimeType.startsWith("image/") && signed.data?.url ? <Image src={signed.data.url} h={180} fit="contain" radius="sm" alt={file.originalName ?? file.type} loading="lazy" /> : null}
      <Text fw={600} mt="sm">{file.originalName ?? file.type}</Text>
      <Text size="xs" c="dimmed">{file.mimeType} · {formatBytes(file.sizeBytes)}{file.width ? ` · ${file.width}×${file.height}` : ""}</Text>
      {signed.isError ? <Button size="xs" variant="light" color="red" mt="sm" onClick={() => void signed.refetch()}>Повторить предпросмотр</Button> : null}
    </Card>
  );
}

export function GenerationDetailPage() {
  const { id = "" } = useParams();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "generations", id], queryFn: () => adminApi<AdminGenerationDetail>(`/api/v1/admin/generations/${id}`) });
  const cancel = useMutation({
    mutationFn: () => adminApi(`/api/v1/admin/generations/${id}/cancel`, { method: "POST" }),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Генерация отменена" });
      await client.invalidateQueries({ queryKey: ["admin", "generations"] });
    },
  });
  const item = query.data;
  const files = item
    ? Array.from(
        new Map(
          [item.media.source, item.media.visualPrompt, item.media.resultOriginal, item.media.resultUser, ...item.media.references]
            .filter((file): file is MediaMetadata => Boolean(file))
            .map((file) => [file.id, file]),
        ).values(),
      )
    : [];
  return (
    <PageFrame
      title={`Генерация ${id.slice(0, 8)}…`}
      description="Полный жизненный цикл, списания, ошибки и медиа"
      actions={<Group><Anchor component={Link} to="/generations">← Все генерации</Anchor>{item?.canCancel ? <Button color="red" variant="light" loading={cancel.isPending} onClick={() => modals.openConfirmModal({ title: "Отменить генерацию?", labels: { confirm: "Отменить", cancel: "Назад" }, confirmProps: { color: "red" }, onConfirm: () => cancel.mutate() })}>Отменить</Button> : null}</Group>}
    >
      <AsyncState loading={query.isLoading} error={query.isError} onRetry={() => void query.refetch()}>
        {item ? (
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
              <Card withBorder><Text size="xs" c="dimmed">Статус</Text><Group mt="sm"><EnumBadge value={item.status} labels={statusLabels} colors={statusColors} /></Group></Card>
              <Card withBorder><Text size="xs" c="dimmed">Пользователь</Text><Anchor component={Link} to={`/users/${item.user.id}`} fw={600} mt="sm">{item.user.account}</Anchor></Card>
              <Card withBorder><Text size="xs" c="dimmed">Комната</Text><Text fw={700} mt="sm">{item.room?.name ?? "—"}</Text>{item.room ? <Text size="xs" c="dimmed">{item.room.code}</Text> : null}</Card>
              <Card withBorder><Text size="xs" c="dimmed">Длительность</Text><Text fw={700} mt="sm">{formatDuration(item.durationMs)}</Text></Card>
              <Card withBorder><Text size="xs" c="dimmed">Стоимость / попытки</Text><Text fw={700} mt="sm">{item.estimatedCost ?? "—"} / {item.attemptCount}</Text></Card>
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, lg: 2 }}>
              <Card withBorder>
                <Title order={2}>Запрос</Title>
                <Text mt="md" style={{ whiteSpace: "pre-wrap" }}>{item.prompt}</Text>
                {item.finalPrompt ? <><Title order={3} mt="xl">Итоговый запрос</Title><Text mt="sm" style={{ whiteSpace: "pre-wrap" }}>{item.finalPrompt}</Text></> : null}
                {item.error ? <Card mt="lg" bg="var(--mantine-color-red-light)"><Text fw={700} c="red">{item.error.code ?? "Ошибка"}</Text><Text size="sm">{item.error.message}</Text></Card> : null}
                {item.providerRequestId ? <Text size="xs" c="dimmed" mt="lg">ID запроса провайдера: <Code>{item.providerRequestId}</Code></Text> : null}
              </Card>
              <Card withBorder>
                <Title order={2}>Хронология</Title>
                <Timeline mt="lg" active={item.timeline.length - 1} bulletSize={20} lineWidth={2}>
                  {item.timeline.map((step) => <Timeline.Item key={`${step.status}-${step.at}`} title={statusLabels[step.status as GenerationStatus] ?? step.status}><Text size="sm" c="dimmed">{formatDateTime(step.at)}</Text></Timeline.Item>)}
                </Timeline>
                <Title order={3} mt="xl">Использование кредитов</Title>
                {item.usage ? <Stack gap={4} mt="sm"><Text>Статус: {usageStatusLabel(item.usage.status)}</Text><Text>Кредиты: {item.usage.creditAmount}</Text><Text size="sm" c="dimmed">Резерв: {formatDateTime(item.usage.reservedAt)}</Text>{item.usage.reason ? <Text size="sm">{item.usage.reason}</Text> : null}</Stack> : <Text c="dimmed" mt="sm">Операция с кредитами отсутствует</Text>}
              </Card>
            </SimpleGrid>
            <div>
              <Title order={2} mb="md">Медиа</Title>
              {files.length ? <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>{files.map((file) => <MediaCard key={`${file.id}-${"position" in file ? file.position : ""}`} file={file} />)}</SimpleGrid> : <Text c="dimmed">Медиа отсутствуют</Text>}
            </div>
          </Stack>
        ) : null}
      </AsyncState>
    </PageFrame>
  );
}
