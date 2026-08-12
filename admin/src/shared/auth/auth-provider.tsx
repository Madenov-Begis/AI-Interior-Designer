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
import { adminSupabase, getDevAdminPhone, setDevAdminPhone } from "./admin-supabase";

type AuthState = "loading" | "authenticated" | "unauthenticated" | "forbidden";
type AuthContextValue = {
  state: AuthState;
  session: AdminSession | null;
  login: (phone: string, password: string) => Promise<void>;
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
    setDevAdminPhone(null);
    await adminSupabase.auth.signOut();
    setSession(null);
    setState("unauthenticated");
  }, []);

  useEffect(() => {
    let active = true;
    void adminSupabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session && !getDevAdminPhone()) {
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
      void adminSupabase.auth.signOut();
      setDevAdminPhone(null);
    };
    window.addEventListener("ruvie-admin-auth-invalid", invalid);
    const { data: authListener } = adminSupabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !getDevAdminPhone()) {
        setSession(null);
        setState("unauthenticated");
      }
    });
    return () => {
      active = false;
      window.removeEventListener("ruvie-admin-auth-invalid", invalid);
      authListener.subscription.unsubscribe();
    };
  }, [validate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      session,
      login: async (phone, password) => {
        setDevAdminPhone(null);
        const { error } = await adminSupabase.auth.signInWithPassword({ phone, password });
        if (error) throw error;
        try {
          await validate();
        } catch (error) {
          await adminSupabase.auth.signOut();
          throw error;
        }
      },
      devLogin: async (phone) => {
        if (!import.meta.env.DEV) throw new Error("Dev login недоступен");
        setDevAdminPhone(phone);
        try {
          await validate();
        } catch (error) {
          setDevAdminPhone(null);
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
