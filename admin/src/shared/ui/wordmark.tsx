import { Group, Text } from "@mantine/core";

export function Wordmark() {
  return (
    <Group gap={8} wrap="nowrap">
      <Text fw={800} fz="lg" lh={1}>Ruvie</Text>
      <Text size="xs" c="dimmed" visibleFrom="xs">Admin</Text>
    </Group>
  );
}
