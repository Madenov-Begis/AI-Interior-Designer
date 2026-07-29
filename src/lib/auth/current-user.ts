import "server-only";

import { getDb } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSystemDefaults } from "@/features/plans/defaults";
import { upsertProfileFromAuthUserWithDatabase } from "@/lib/auth/profile-upsert";
import {
  currentUserFromClaims,
  type CurrentUser,
} from "@/lib/auth/claims";

export class UnauthorizedError extends Error {
  constructor(message = "Требуется авторизация") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const user = currentUserFromClaims(claimsData?.claims);
  if (claimsError || !user) throw new UnauthorizedError();

  const profile = await getDb().profile.findUnique({
    where: { id: user.id },
    select: { status: true },
  });
  if (profile && profile.status !== "ACTIVE") throw new UnauthorizedError("Аккаунт заблокирован");
  return user;
}

export async function upsertProfileFromAuthUser(user: CurrentUser) {
  const { freePlan } = await ensureSystemDefaults();
  return upsertProfileFromAuthUserWithDatabase(
    getDb(),
    user,
    freePlan.id,
  );
}
