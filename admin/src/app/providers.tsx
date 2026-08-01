import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { theme } from "./theme";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false } } }));
  return <QueryClientProvider client={client}><MantineProvider theme={theme} forceColorScheme="dark"><ModalsProvider><Notifications position="top-right" /><>{children}</></ModalsProvider></MantineProvider></QueryClientProvider>;
}
