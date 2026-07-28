type GenerationTreeItem = {
  id: string;
  parentGenerationId: string | null;
  createdAt: string;
};

export function buildGenerationLabels(items: GenerationTreeItem[]) {
  const itemIds = new Set(items.map((item) => item.id));
  const children = new Map<string | null, GenerationTreeItem[]>();
  for (const item of items) {
    const parentId =
      item.parentGenerationId && itemIds.has(item.parentGenerationId)
        ? item.parentGenerationId
        : null;
    const group = children.get(parentId) ?? [];
    group.push(item);
    children.set(parentId, group);
  }
  for (const group of children.values()) {
    group.sort(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) ||
        left.id.localeCompare(right.id),
    );
  }

  const labels = new Map<string, string>();
  function visit(parentId: string | null, prefix: string) {
    for (const [index, item] of (children.get(parentId) ?? []).entries()) {
      const label = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      labels.set(item.id, label);
      visit(item.id, label);
    }
  }
  visit(null, "");
  return labels;
}
