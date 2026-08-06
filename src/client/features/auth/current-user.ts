export type CurrentUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
};

export type AuthMePayload = {
  id: string;
  email?: string | null;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
};

export function currentUserFromAuthMe(payload: AuthMePayload): CurrentUser {
  const profile = payload.profile;
  const nameFromParts = [profile?.firstName, profile?.lastName]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");

  return {
    id: payload.id,
    email: payload.email ?? null,
    user_metadata: {
      full_name: profile?.displayName?.trim() || nameFromParts || undefined,
      avatar_url: profile?.avatarUrl ?? undefined,
    },
  };
}
