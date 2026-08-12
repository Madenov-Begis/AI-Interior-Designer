import { Card, Group, ScrollArea, Stack, Table, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { ReactNode } from "react";

export type ResourceColumn<T> = {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  mobile?: boolean;
};

export function ResourceTable<T>({
  items,
  columns,
  getKey,
}: {
  items: T[];
  columns: Array<ResourceColumn<T>>;
  getKey: (item: T) => string;
}) {
  const mobile = useMediaQuery("(max-width: 47.99em)");
  if (mobile)
    return (
      <Stack gap="sm">
        {items.map((item) => (
          <Card key={getKey(item)} withBorder padding="md">
            <Stack gap="xs">
              {columns.filter((column) => column.mobile !== false).map((column) => (
                <Group key={column.key} justify="space-between" align="flex-start" wrap="nowrap">
                  <Text size="xs" c="dimmed" fw={600}>{column.label}</Text>
                  <div style={{ minWidth: 0, textAlign: "right" }}>{column.render(item)}</div>
                </Group>
              ))}
            </Stack>
          </Card>
        ))}
      </Stack>
    );
  return (
    <Card withBorder padding={0}>
      <ScrollArea>
        <Table stickyHeader highlightOnHover verticalSpacing="md" horizontalSpacing="lg" miw={900}>
          <Table.Thead>
            <Table.Tr>
              {columns.map((column) => <Table.Th key={column.key}>{column.label}</Table.Th>)}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <Table.Tr key={getKey(item)} className="admin-table-row">
                {columns.map((column) => <Table.Td key={column.key}>{column.render(item)}</Table.Td>)}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Card>
  );
}
