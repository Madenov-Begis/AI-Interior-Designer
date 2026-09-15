import { apiData } from "../client.ts";

export type RoomTypeOption = {
  id: string;
  code: string;
  name: string;
};

export const roomsQueries = {
  catalog: () => ({
    queryKey: ["rooms"] as const,
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      apiData<{ items: RoomTypeOption[] }>({
        url: "/rooms",
        method: "GET",
        signal,
      }),
    staleTime: 60_000,
  }),
};
