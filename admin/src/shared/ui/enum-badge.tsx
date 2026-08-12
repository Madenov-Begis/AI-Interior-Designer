import { Badge } from "@mantine/core";

export function EnumBadge({
  value,
  labels,
  colors,
}: {
  value: string;
  labels: Record<string, string>;
  colors?: Record<string, string>;
}) {
  return <Badge color={colors?.[value] ?? "gray"} variant="light">{labels[value] ?? value}</Badge>;
}
