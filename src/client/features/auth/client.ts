"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { useEffect } from "react";
import { currentUserFromClaims } from "@/client/features/auth/claims";
import { createSupabaseBrowserClient } from "@/client/shared/supabase/browser";

export const currentAuthUserQueryKey = ["auth", "claims"] as const;

export function useCurrentAuthUser() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: currentAuthUserQueryKey,
    queryFn: async () => {
      const { data, error } =
        await createSupabaseBrowserClient().auth.getClaims();
      if (error) return null;
      return currentUserFromClaims(data?.claims);
    },
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    const { data } = createSupabaseBrowserClient().auth.onAuthStateChange(
      (event: AuthChangeEvent) => {
        if (event !== "INITIAL_SESSION") {
          void queryClient.invalidateQueries({
            queryKey: currentAuthUserQueryKey,
          });
        }
      },
    );

    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  return query;
}
