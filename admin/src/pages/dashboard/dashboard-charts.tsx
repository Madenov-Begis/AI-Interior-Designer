import "@mantine/charts/styles.css";
import { AreaChart, DonutChart } from "@mantine/charts";
import { Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import type { AdminStats, GenerationStatus } from "@/shared/api";

const labels: Record<GenerationStatus, string> = {
  QUEUED: "В очереди",
  PROCESSING: "Обрабатываются",
  SUCCEEDED: "Успешно",
  FAILED: "Ошибки",
  CANCELLED: "Отменены",
  REJECTED: "Отклонены",
};
const colors: Record<GenerationStatus, string> = {
  QUEUED: "yellow.6",
  PROCESSING: "blue.6",
  SUCCEEDED: "green.6",
  FAILED: "red.6",
  CANCELLED: "gray.6",
  REJECTED: "orange.6",
};

export function DashboardCharts({ stats }: { stats: AdminStats }) {
  const donut = Object.entries(stats.statusBreakdown).map(([status, value]) => ({
    name: labels[status as GenerationStatus],
    value,
    color: colors[status as GenerationStatus],
  }));
  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }}>
      <Card withBorder>
        <Text fw={700} mb="lg">Генерации по дням</Text>
        <AreaChart
          h={300}
          data={stats.dailySeries}
          dataKey="date"
          series={[{ name: "count", label: "Генерации", color: "blue.6" }]}
          curveType="linear"
          withLegend={false}
        />
      </Card>
      <Card withBorder>
        <Text fw={700} mb="lg">Статусы за период</Text>
        <Group align="center" justify="space-around" gap="xl">
          <DonutChart data={donut} h={220} w={220} withTooltip />
          <Stack gap="xs">
            {donut.map((item) => (
              <Group key={item.name} justify="space-between" gap="xl" wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                  <div style={{ width: 10, height: 10, borderRadius: 10, background: `var(--mantine-color-${item.color.replace(".", "-")})` }} />
                  <Text size="sm">{item.name}</Text>
                </Group>
                <Text size="sm" fw={700}>{item.value}</Text>
              </Group>
            ))}
          </Stack>
        </Group>
      </Card>
    </SimpleGrid>
  );
}
