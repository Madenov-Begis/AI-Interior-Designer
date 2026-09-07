type TreeRow = {
  id: string;
  projectId: string;
  parentGenerationId: string | null;
  createdAt: Date;
};

// Include deleted rows: deleting a variant must not renumber its siblings.
export function generationTreeLabels(rows: TreeRow[]) {
  const children = new Map<string, TreeRow[]>();
  for (const row of rows) {
    const key = row.parentGenerationId ?? row.projectId;
    const group = children.get(key) ?? [];
    group.push(row);
    children.set(key, group);
  }
  for (const group of children.values()) {
    group.sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    );
  }
  const labels = new Map<string, string>();
  const pending = [...new Set(rows.map((row) => row.projectId))].map((id) => ({
    id,
    prefix: "",
  }));
  while (pending.length) {
    const { id, prefix } = pending.pop()!;
    for (const [index, row] of (children.get(id) ?? []).entries()) {
      if (labels.has(row.id)) continue;
      const label = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      labels.set(row.id, label);
      pending.push({ id: row.id, prefix: label });
    }
  }
  return labels;
}
