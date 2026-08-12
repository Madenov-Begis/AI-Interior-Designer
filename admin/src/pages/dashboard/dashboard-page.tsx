import { Card, SegmentedControl, SimpleGrid, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApi, type AdminStats } from "@/shared/api";
import { formatNumber } from "@/shared/lib";
import { AsyncState, PageFrame } from "@/shared/ui";

const DashboardCharts = lazy(() =>
  import("./dashboard-charts").then((module) => ({ default: module.DashboardCharts })),
);

export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const rawPeriod = params.get("period");
  const period = rawPeriod === "today" || rawPeriod === "30d" ? rawPeriod : "7d";
  const query = useQuery({
    queryKey: ["admin", "stats", period],
    queryFn: () => adminApi<AdminStats>(`/api/v1/admin/stats?period=${period}`),
  });
  const stats = query.data;
  const cards = stats
    ? [
        ["Всего пользователей", stats.totals.users],
        ["Активные пользователи", stats.activity.activeUsers],
        ["Генерации за период", stats.activity.generations],
        ["Ошибки за период", stats.activity.failed],
        ["В очереди", stats.queue.queued],
        ["В обработке", stats.queue.processing],
      ] as const
    : [];
  return (
    <PageFrame
      title="Обзор"
      description="Ключевые показатели и состояние генераций"
      actions={
        <SegmentedControl
          aria-label="Период статистики"
          value={period}
          onChange={(value) => setParams({ period: value })}
          data={[{ value: "today", label: "Сегодня" }, { value: "7d", label: "7 дней" }, { value: "30d", label: "30 дней" }]}
        />
      }
    >
      <AsyncState loading={query.isLoading} error={query.isError} onRetry={() => void query.refetch()}>
        {stats ? (
          <>
            <SimpleGrid cols={{ base: 1, xs: 2, lg: 3 }}>
              {cards.map(([label, value]) => (
                <Card key={label} withBorder>
                  <Text size="sm" c="dimmed">{label}</Text>
                  <Title order={2} mt="sm">{formatNumber(value)}</Title>
                </Card>
              ))}
            </SimpleGrid>
            <Suspense fallback={<Card withBorder h={320} />}>
              <DashboardCharts stats={stats} />
            </Suspense>
          </>
        ) : null}
      </AsyncState>
    </PageFrame>
  );
}
