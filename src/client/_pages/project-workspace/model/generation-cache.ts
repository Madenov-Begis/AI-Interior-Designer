import type {
  WorkspaceGeneration,
  WorkspaceGenerationList,
} from "./workspace-types.ts";

function sameGenerationSnapshot(
  current: WorkspaceGeneration,
  incoming: WorkspaceGeneration,
) {
  return (
    current.id === incoming.id &&
    current.variantNumber === incoming.variantNumber &&
    current.parentGenerationId === incoming.parentGenerationId &&
    current.status === incoming.status &&
    current.prompt === incoming.prompt &&
    current.aspectRatio === incoming.aspectRatio &&
    current.resultUserId === incoming.resultUserId &&
    current.resultUrl === incoming.resultUrl &&
    current.resultUser?.width === incoming.resultUser?.width &&
    current.resultUser?.height === incoming.resultUser?.height &&
    current.errorCode === incoming.errorCode &&
    current.errorMessage === incoming.errorMessage &&
    current.createdAt === incoming.createdAt &&
    current.completedAt === incoming.completedAt &&
    current.references.length === incoming.references.length &&
    current.references.every(
      (reference, index) =>
        reference.fileId === incoming.references[index]?.fileId &&
        reference.position === incoming.references[index]?.position,
    )
  );
}

export function mergeGenerationIntoList(
  current: WorkspaceGenerationList | undefined,
  generation: WorkspaceGeneration,
): WorkspaceGenerationList {
  if (!current) {
    return { items: [generation], nextCursor: null, total: 1 };
  }

  const index = current.items.findIndex((item) => item.id === generation.id);
  if (index < 0) {
    return {
      ...current,
      items: [generation, ...current.items],
      total: current.total + 1,
    };
  }
  if (sameGenerationSnapshot(current.items[index]!, generation)) {
    return current;
  }

  return {
    ...current,
    items: current.items.map((item, itemIndex) =>
      itemIndex === index ? generation : item,
    ),
  };
}

export function appendGenerationPage(
  current: WorkspaceGenerationList | undefined,
  page: WorkspaceGenerationList,
): WorkspaceGenerationList {
  if (!current) return page;
  // Keep newer mutation/polling snapshots if a page response overlaps them.
  const knownIds = new Set(current.items.map((item) => item.id));
  const items = [
    ...current.items,
    ...page.items.filter((item) => !knownIds.has(item.id)),
  ];
  return {
    items,
    nextCursor: page.nextCursor,
    total: Math.max(page.total, items.length),
  };
}
