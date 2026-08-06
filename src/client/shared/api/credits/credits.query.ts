import { apiData } from "../client.ts";

export const creditsQueries = {
  packages: () => ({
    queryKey: ["credits", "packages"] as const,
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      apiData<unknown>({ url: "/credits/packages", method: "GET", signal }),
  }),

  transactions: () => ({
    queryKey: ["credits", "transactions"] as const,
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      apiData<unknown>({ url: "/credits/transactions", method: "GET", signal }),
  }),
};
