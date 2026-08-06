"use client";

import { useQuery, type QueryClient } from "@tanstack/react-query";
import type {
  AppSession,
  AppUser,
  AuthMePayload,
} from "../model/current-user.ts";
import { apiData, ApiClientError } from "../../../shared/api/index.ts";

export const APP_SESSION_QUERY_KEY = ["auth", "me"] as const;
export const currentAuthUserQueryKey = APP_SESSION_QUERY_KEY;

export async function loadAppSession(): Promise<AppSession | null> {
  try {
    return await apiData<AuthMePayload>({
      url: "/auth/me",
      method: "GET",
      skipAuthRedirect: true,
    });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) return null;
    throw error;
  }
}

export function useAppSessionQuery() {
  return useQuery({
    queryKey: APP_SESSION_QUERY_KEY,
    queryFn: loadAppSession,
    retry: false,
    staleTime: Infinity,
  });
}

export function useCurrentAuthUser() {
  return useQuery({
    queryKey: APP_SESSION_QUERY_KEY,
    queryFn: loadAppSession,
    retry: false,
    staleTime: Infinity,
    select: (session): AppUser | null => session?.user ?? null,
  });
}

export async function refreshAppSession(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: APP_SESSION_QUERY_KEY });
  await queryClient.invalidateQueries({ queryKey: APP_SESSION_QUERY_KEY });
}

export function setAppSessionBalance(
  queryClient: QueryClient,
  balance: number,
) {
  queryClient.setQueryData<AppSession | null>(
    APP_SESSION_QUERY_KEY,
    (session) =>
      session
        ? { ...session, wallet: { ...session.wallet, balance } }
        : session,
  );
}

export function updateAppSessionUser(
  queryClient: QueryClient,
  user: Partial<Pick<AppUser, "name" | "email" | "avatarUrl">>,
) {
  queryClient.setQueryData<AppSession | null>(
    APP_SESSION_QUERY_KEY,
    (session) =>
      session ? { ...session, user: { ...session.user, ...user } } : session,
  );
}
