import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { clearAdminPhone, getAdminPhone } from "../shared/admin-session";
import { LoginPage } from "../features/auth/login-page";
import { AdminShell } from "../widgets/admin-shell";
import { DashboardPage } from "../pages/dashboard-page";
import { UsersPage } from "../pages/users-page";
import { GenerationsPage } from "../pages/generations-page";
import { FinancePage, PlansPage } from "../pages/resources-pages";

export function AppRouter() {
  const [authenticated, setAuthenticated] = useState(() =>
    Boolean(getAdminPhone()),
  );
  if (!authenticated)
    return <LoginPage onAuthenticated={() => setAuthenticated(true)} />;
  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <AdminShell
              onLogout={() => {
                clearAdminPhone();
                setAuthenticated(false);
              }}
            />
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="generations" element={<GenerationsPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
