export const generationStatuses = [
  "QUEUED",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "REJECTED",
] as const;

export function iso(value: Date | null) {
  return value?.toISOString() ?? null;
}

export function account(value: {
  displayName: string | null;
  email: string | null;
  phone: string | null;
}) {
  return value.displayName || value.email || value.phone || "Без имени";
}

export function pageInfo(page: number, pageSize: number, totalItems: number) {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  };
}
