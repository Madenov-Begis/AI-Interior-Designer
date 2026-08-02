import type { QueryClient } from "@tanstack/react-query";
import { apiData } from "../../lib/api/client.ts";

export type CreditBalancePayload = {
  balance: number;
  generationCost: number;
};

export const CREDITS_QUERY_KEY = ["credits"] as const;

export function creditQueryOptions<TData extends CreditBalancePayload>(
  queryFn: (context: { signal: AbortSignal }) => Promise<TData>,
  placeholderData?: TData,
) {
  return {
    queryKey: CREDITS_QUERY_KEY,
    queryFn,
    placeholderData,
  };
}

export async function loadCredits<TData extends CreditBalancePayload>(
  signal?: AbortSignal,
): Promise<TData> {
  return apiData<TData>({ url: "/credits", method: "GET", signal });
}

export async function refreshCreditsQuery(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: CREDITS_QUERY_KEY });
  await queryClient.invalidateQueries({ queryKey: CREDITS_QUERY_KEY });
}
