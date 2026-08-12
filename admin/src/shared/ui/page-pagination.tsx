import { Group, Pagination, Select, Text } from "@mantine/core";
import type { PageInfo } from "@/shared/api";

export function PagePagination({
  pageInfo,
  onPage,
  onPageSize,
}: {
  pageInfo: PageInfo;
  onPage: (page: number) => void;
  onPageSize: (pageSize: number) => void;
}) {
  if (!pageInfo.totalItems) return null;
  return (
    <Group justify="space-between" gap="md" wrap="wrap">
      <Text size="sm" c="dimmed">Всего: {pageInfo.totalItems}</Text>
      <Group gap="sm">
        <Select
          aria-label="Количество строк на странице"
          w={88}
          value={String(pageInfo.pageSize)}
          onChange={(value) => value && onPageSize(Number(value))}
          data={["25", "50", "100"]}
          allowDeselect={false}
        />
        <Pagination value={pageInfo.page} total={Math.max(pageInfo.totalPages, 1)} onChange={onPage} />
      </Group>
    </Group>
  );
}
