import { Button, Center, Container, Loader, Stack, Text, Title } from "@mantine/core";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "@/pages/login";
import { useAuth } from "@/shared/auth";
import { AdminShell } from "./admin-shell";
import { AppErrorBoundary } from "./error-boundary";

const DashboardPage = lazy(() => import("@/pages/dashboard"));
const UsersPage = lazy(() => import("@/pages/users"));
const UserDetailPage = lazy(() => import("@/pages/user-detail"));
const GenerationsPage = lazy(() => import("@/pages/generations"));
const GenerationDetailPage = lazy(() => import("@/pages/generation-detail"));
const PaymentOrdersPage = lazy(() => import("@/pages/payment-orders"));
const CreditTransactionsPage = lazy(() => import("@/pages/credit-transactions"));
const PlansPage = lazy(() => import("@/pages/plans"));

function ProtectedApp() {
  const { state, logout } = useAuth();
  if (state === "forbidden")
    return (
      <Center mih="100vh" p="md">
        <Container size="xs">
          <Stack align="center">
            <Title order={1}>Нет доступа</Title>
            <Text c="dimmed" ta="center">Аккаунт существует, но не является активным администратором.</Text>
            <Button onClick={() => void logout()}>Войти другим аккаунтом</Button>
          </Stack>
        </Container>
      </Center>
    );
  if (state !== "authenticated") return <Navigate to="/login" replace />;
  return <AdminShell />;
}

function RouteLoader() {
  return <Center mih={300} aria-label="Загрузка страницы"><Loader /></Center>;
}

export function AppRouter() {
  const { state } = useAuth();
  return (
    <AppErrorBoundary>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/login" element={state === "authenticated" ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route element={<ProtectedApp />}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="generations" element={<GenerationsPage />} />
            <Route path="generations/:id" element={<GenerationDetailPage />} />
            <Route path="finance" element={<Navigate to="/finance/orders" replace />} />
            <Route path="finance/orders" element={<PaymentOrdersPage />} />
            <Route path="finance/transactions" element={<CreditTransactionsPage />} />
            <Route path="plans" element={<PlansPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}
