import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../shared/api";

export function useAdminQuery<T>(key: readonly unknown[], path: string) {
  return useQuery({ queryKey: key, queryFn: () => adminApi<T>(path) });
}

export type ListResponse<T> = { items: T[]; nextCursor: string | null };
