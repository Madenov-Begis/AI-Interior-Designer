import type { QueryClient } from "@tanstack/react-query";

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
  const response = await fetch("/api/v1/credits", { signal });
  const payload = (await response.json()) as {
    data?: TData;
    error?: { message?: string };
  };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "Не удалось загрузить кредиты");
  }
  return payload.data;
}

export async function refreshCreditsQuery(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: CREDITS_QUERY_KEY });
  await queryClient.invalidateQueries({ queryKey: CREDITS_QUERY_KEY });
}
