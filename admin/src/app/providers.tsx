import {
  MantineProvider,
  localStorageColorSchemeManager,
} from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { NavigationProgress, nprogress } from "@mantine/nprogress";
import { Notifications, notifications } from "@mantine/notifications";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useIsFetching,
  useIsMutating,
} from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { AuthProvider } from "@/shared/auth";
import { AdminApiError } from "@/shared/api";
import { theme } from "./theme";

const colorSchemeManager = localStorageColorSchemeManager({
  key: "ruvie-admin-color-scheme",
});

function errorMessage(error: unknown) {
  return error instanceof AdminApiError
    ? error.message
    : "Произошла непредвиденная ошибка";
}

function ProgressSync() {
  const active = useIsFetching() + useIsMutating();
  useEffect(() => {
    if (active > 0) nprogress.start();
    else nprogress.complete();
  }, [active]);
  return <NavigationProgress />;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (query.meta?.silentError) return;
            notifications.show({ color: "red", title: "Ошибка загрузки", message: errorMessage(error) });
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) =>
            notifications.show({ color: "red", title: "Операция не выполнена", message: errorMessage(error) }),
        }),
        defaultOptions: {
          queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={theme}
        defaultColorScheme="auto"
        colorSchemeManager={colorSchemeManager}
      >
        <ModalsProvider>
          <Notifications position="top-right" />
          <ProgressSync />
          <AuthProvider>{children}</AuthProvider>
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
