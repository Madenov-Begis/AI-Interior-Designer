import "server-only";

import { getDb } from "@/server/shared/db/prisma";
import { createSupabaseTokenClient } from "@/server/shared/integrations/supabase/token-client";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { upsertProfileFromAuthUserWithDatabase } from "@/server/features/auth/profile-upsert";
import {
  currentUserFromClaims,
  type CurrentUser,
} from "@/server/features/auth/claims";

export class UnauthorizedError extends Error {
  constructor(message = "Требуется авторизация") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function bearerToken(authorization: string | null) {
  return authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

async function currentUserFromAccessToken(token: string) {
  const { data, error } =
    await createSupabaseTokenClient().auth.getClaims(token);
  const user = currentUserFromClaims(data?.claims);
  if (error || !user) throw new UnauthorizedError();
  return user;
}

async function requireActiveProfile(user: CurrentUser) {
  const profile = await getDb().profile.findUnique({
    where: { id: user.id },
    select: { status: true },
  });
  if (!profile) throw new UnauthorizedError("Профиль не настроен");
  if (profile.status !== "ACTIVE")
    throw new UnauthorizedError("Аккаунт заблокирован");
  return user;
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const requestHeaders = await headers();
  const token = bearerToken(requestHeaders.get("authorization"));
  if (!token) throw new UnauthorizedError();
  return requireActiveProfile(await currentUserFromAccessToken(token));
}

/**
 * Validates a Supabase access token supplied by a separate trusted frontend.
 * This intentionally verifies the token remotely instead of trusting decoded
 * browser data or user metadata.
 */
export async function requireCurrentUserFromBearer(
  request: NextRequest | Headers,
): Promise<CurrentUser> {
  const authorization =
    request instanceof Headers
      ? request.get("authorization")
      : request.headers.get("authorization");
  const token = bearerToken(authorization);
  if (!token) throw new UnauthorizedError();
  return requireActiveProfile(await currentUserFromAccessToken(token));
}

export async function upsertProfileFromAuthUser(user: CurrentUser) {
  return upsertProfileFromAuthUserWithDatabase(getDb(), user);
}
