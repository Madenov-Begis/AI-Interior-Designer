"use client";

import { useQuery } from "@tanstack/react-query";
import {
  currentUserFromAuthMe,
  type AuthMePayload,
} from "@/client/features/auth/current-user";
import { apiData, ApiClientError } from "@/client/shared/api/client";

export const currentAuthUserQueryKey = ["auth", "me"] as const;

export function useCurrentAuthUser() {
  return useQuery({
    queryKey: currentAuthUserQueryKey,
    queryFn: async () => {
      try {
        const payload = await apiData<AuthMePayload>({
          url: "/auth/me",
          method: "GET",
          skipAuthRedirect: true,
        });
        return currentUserFromAuthMe(payload);
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401)
          return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 30_000,
  });
}
