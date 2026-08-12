import { Box, Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

export function PageFrame({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack gap="xl" maw={1600} mx="auto">
      <Group justify="space-between" align="flex-end" gap="md" wrap="wrap">
        <Box>
          <Title order={1} fz={{ base: 28, sm: 34 }} tabIndex={-1} data-page-title>{title}</Title>
          {description ? <Text c="dimmed" mt={4}>{description}</Text> : null}
        </Box>
        {actions}
      </Group>
      {children}
    </Stack>
  );
}
