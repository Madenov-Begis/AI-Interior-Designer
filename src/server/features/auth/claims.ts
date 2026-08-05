import type { JwtPayload } from "@supabase/supabase-js";

export type CurrentUser = {
  id: string;
  email?: string | null;
  user_metadata: Record<string, unknown>;
};

export function currentUserFromClaims(
  claims: Partial<JwtPayload> | null | undefined,
): CurrentUser | null {
  if (!claims || typeof claims.sub !== "string" || !claims.sub) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    user_metadata:
      claims.user_metadata &&
      typeof claims.user_metadata === "object" &&
      !Array.isArray(claims.user_metadata)
        ? claims.user_metadata
        : {},
  };
}
