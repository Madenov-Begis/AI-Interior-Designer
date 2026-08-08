import { AreaChart, DonutChart } from "@mantine/charts";
import { Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { useAdminQuery } from "../entities/admin/hooks";
import { PageFrame, PageLoading } from "../widgets/page-frame";

type Stats = {
  users: number;
  activeUsers: number;
  projects: number;
  generations: number;
  generations24h: number;
  failed24h: number;
  queued: number;
  period: number;
  dailyGenerations: Array<{ date: string; count: number }>;
};
export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const period = params.get("period") ?? "7d";
  const query = useAdminQuery<Stats>(
    ["stats", period],
    `/api/v1/admin/stats?period=${period}`,
  );
  if (query.isLoading) return <PageLoading />;
  if (!query.data) return null;
  const stats = query.data;
  const cards = [
    ["Пользователи", stats.users],
    [`Активны за ${stats.period} дн.`, stats.activeUsers],
    [`Генерации за ${stats.period} дн.`, stats.generations24h],
    [`Ошибки за ${stats.period} дн.`, stats.failed24h],
    ["В очереди", stats.queued],
    ["Проекты", stats.projects],
  ];
  return (
    <PageFrame
      title="Обзор"
      description="Операционные показатели ROOVA"
      actions={
        <Group>
          {["today", "7d", "30d"].map((value) => (
            <Text
              key={value}
              c={period === value ? "roova.3" : "dimmed"}
              fw={700}
              style={{ cursor: "pointer" }}
              onClick={() => setParams({ period: value })}
            >
              {value === "today" ? "Сегодня" : value}
            </Text>
          ))}
        </Group>
      }
    >
      <SimpleGrid cols={3}>
        {cards.map(([label, value]) => (
          <Card key={String(label)} withBorder bg="dark.8">
            <Text c="dimmed" size="sm">
              {label}
            </Text>
            <Title order={2} mt="md">
              {value}
            </Title>
          </Card>
        ))}
      </SimpleGrid>
      <SimpleGrid cols={2}>
        <Card withBorder bg="dark.8">
          <Text fw={700} mb="md">
            Активность
          </Text>
          <AreaChart
            h={280}
            data={stats.dailyGenerations}
            dataKey="date"
            series={[{ name: "count", color: "roova.3" }]}
          />
        </Card>
        <Card withBorder bg="dark.8">
          <Text fw={700} mb="md">
            Статус генераций
          </Text>
          <Group justify="center">
            <DonutChart
              data={[
                {
                  name: "Успешно",
                  value: Math.max(stats.generations24h - stats.failed24h, 0),
                  color: "roova.3",
                },
                { name: "Ошибки", value: stats.failed24h, color: "red.6" },
              ]}
            />
          </Group>
        </Card>
      </SimpleGrid>
    </PageFrame>
  );
}
