export type PaginationItem = number | "ellipsis";

export function getPaginationItems(
  currentPage: number,
  pageCount: number,
): PaginationItem[] {
  if (pageCount <= 0) return [];

  const page = Math.min(Math.max(1, currentPage), pageCount);
  const visiblePages = new Set<number>([1, pageCount]);

  if (pageCount <= 7) {
    for (let value = 1; value <= pageCount; value += 1) {
      visiblePages.add(value);
    }
  } else if (page <= 3) {
    [2, 3, 4].forEach((value) => visiblePages.add(value));
  } else if (page >= pageCount - 2) {
    [pageCount - 3, pageCount - 2, pageCount - 1].forEach((value) =>
      visiblePages.add(value),
    );
  } else {
    [page - 1, page, page + 1].forEach((value) => visiblePages.add(value));
  }

  const sortedPages = [...visiblePages].sort((left, right) => left - right);
  const items: PaginationItem[] = [];

  sortedPages.forEach((value, index) => {
    const previous = sortedPages[index - 1];
    if (previous && value - previous === 2) items.push(previous + 1);
    if (previous && value - previous > 2) items.push("ellipsis");
    items.push(value);
  });

  return items;
}
