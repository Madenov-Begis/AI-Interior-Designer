import { apiData, ApiClientError } from "../client.ts";
import type {
  AppSession,
  AuthMePayload,
} from "../../../entities/user/model/types.ts";

export const authQueries = {
  session: () => ({
    queryKey: ["auth", "me"] as const,
    queryFn: async (): Promise<AppSession | null> => {
      try {
        return await apiData<AuthMePayload>({
          url: "/auth/me",
          method: "GET",
          skipAuthRedirect: true,
        });
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401)
          return null;
        throw error;
      }
    },
    retry: false as const,
    staleTime: Infinity,
  }),
};
