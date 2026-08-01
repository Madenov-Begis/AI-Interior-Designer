import { Box, Group, Skeleton, Stack, Text, Title } from "@mantine/core";
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
      <Group justify="space-between" align="end">
        <Box>
          <Title order={1}>{title}</Title>
          {description ? (
            <Text c="dimmed" mt={5}>
              {description}
            </Text>
          ) : null}
        </Box>
        {actions}
      </Group>
      {children}
    </Stack>
  );
}

export function PageLoading() {
  return (
    <Stack>
      <Skeleton h={42} w={300} />
      <Skeleton h={360} />
    </Stack>
  );
}
