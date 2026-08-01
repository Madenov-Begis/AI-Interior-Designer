import {
  Alert,
  Box,
  Card,
  ScrollArea,
  Skeleton,
  Table,
  Text,
} from "@mantine/core";
import type { ReactNode } from "react";

export function ResourceTable({
  headers,
  rows,
  loading,
  empty = "Пока нет данных",
}: {
  headers: string[];
  rows: Array<Array<ReactNode>>;
  loading?: boolean;
  empty?: string;
}) {
  if (loading) return <Skeleton h={360} />;
  return (
    <Card withBorder bg="dark.8" p={0}>
      <ScrollArea>
        <Table
          horizontalSpacing="lg"
          verticalSpacing="md"
          stickyHeader
          highlightOnHover
          miw={900}
        >
          <Table.Thead>
            <Table.Tr>
              {headers.map((header) => (
                <Table.Th key={header}>{header}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <Table.Tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <Table.Td key={cellIndex}>{cell}</Table.Td>
                  ))}
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={headers.length}>
                  <Text c="dimmed" ta="center" py="xl">
                    {empty}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Card>
  );
}
