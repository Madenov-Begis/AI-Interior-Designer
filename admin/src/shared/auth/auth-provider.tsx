import { Center, Loader } from "@mantine/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { adminApi, AdminApiError, type AdminSession } from "@/shared/api";
import type { AdminLoginSession } from "@/shared/api";
import {
  clearAdminCredentials,
  getAdminToken,
  getDevAdminPhone,
  setDevAdminPhone,
  storeAdminToken,
} from "./admin-session";

type AuthState = "loading" | "authenticated" | "unauthenticated" | "forbidden";
type AuthContextValue = {
  state: AuthState;
  session: AdminSession | null;
  login: (code: string) => Promise<void>;
  devLogin: (phone: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("loading");
  const [session, setSession] = useState<AdminSession | null>(null);

  const validate = useCallback(async () => {
    const current = await adminApi<AdminSession>("/api/v1/admin/session");
    setSession(current);
    setState("authenticated");
  }, []);

  const logout = useCallback(async () => {
    clearAdminCredentials();
    setSession(null);
    setState("unauthenticated");
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      if (!getAdminToken() && !getDevAdminPhone()) {
        setState("unauthenticated");
        return;
      }
      try {
        await validate();
      } catch (error) {
        if (!active) return;
        setState(error instanceof AdminApiError && error.status === 403 ? "forbidden" : "unauthenticated");
      }
    });
    const invalid = (event: Event) => {
      const detail = (event as CustomEvent<{ forbidden?: boolean }>).detail;
      setSession(null);
      setState(detail?.forbidden ? "forbidden" : "unauthenticated");
      clearAdminCredentials();
    };
    window.addEventListener("ruvie-admin-auth-invalid", invalid);
    return () => {
      active = false;
      window.removeEventListener("ruvie-admin-auth-invalid", invalid);
    };
  }, [validate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      session,
      login: async (code) => {
        clearAdminCredentials();
        const created = await adminApi<AdminLoginSession>("/api/v1/admin/login", {
          method: "POST",
          body: JSON.stringify({ code }),
        });
        storeAdminToken(created);
        try {
          await validate();
        } catch (error) {
          clearAdminCredentials();
          throw error;
        }
      },
      devLogin: async (phone) => {
        if (!import.meta.env.DEV) throw new Error("Dev login недоступен");
        setDevAdminPhone(phone);
        try {
          await validate();
        } catch (error) {
          clearAdminCredentials();
          throw error;
        }
      },
      logout,
    }),
    [logout, session, state, validate],
  );

  if (state === "loading")
    return (
      <Center mih="100vh" aria-label="Проверка сессии">
        <Loader />
      </Center>
    );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
