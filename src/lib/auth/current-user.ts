import "server-only";

import { getDb } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { ensureSystemDefaults } from "@/features/plans/defaults";
import { upsertProfileFromAuthUserWithDatabase } from "@/lib/auth/profile-upsert";
import { currentUserFromClaims, type CurrentUser } from "@/lib/auth/claims";

export class UnauthorizedError extends Error {
  constructor(message = "Требуется авторизация") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const user = currentUserFromClaims(claimsData?.claims);
  if (claimsError || !user) throw new UnauthorizedError();

  const profile = await getDb().profile.findUnique({
    where: { id: user.id },
    select: { status: true },
  });
  if (profile && profile.status !== "ACTIVE")
    throw new UnauthorizedError("Аккаунт заблокирован");
  return user;
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
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new UnauthorizedError();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new UnauthorizedError();

  const profile = await getDb().profile.findUnique({
    where: { id: data.user.id },
    select: { status: true },
  });
  if (profile && profile.status !== "ACTIVE")
    throw new UnauthorizedError("Аккаунт заблокирован");

  return {
    id: data.user.id,
    email: data.user.email,
    user_metadata: data.user.user_metadata ?? {},
  };
}

export async function upsertProfileFromAuthUser(user: CurrentUser) {
  const { freePlan } = await ensureSystemDefaults();
  return upsertProfileFromAuthUserWithDatabase(getDb(), user, freePlan.id);
}
