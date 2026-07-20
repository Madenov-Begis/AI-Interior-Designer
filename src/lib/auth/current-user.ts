import "server-only";

import type { User } from "@supabase/supabase-js";
import { getDb } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSystemDefaults } from "@/features/plans/defaults";

export class UnauthorizedError extends Error {
  constructor() {
    super("Требуется авторизация");
    this.name = "UnauthorizedError";
  }
}

export async function requireCurrentUser(): Promise<User> {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) throw new UnauthorizedError();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== claimsData.claims.sub) throw new UnauthorizedError();
  return data.user;
}

export async function upsertProfileFromAuthUser(user: User) {
  if (!user.email) throw new Error("Google account did not provide an email");

  const metadata = user.user_metadata ?? {};
  const firstName = typeof metadata.given_name === "string" ? metadata.given_name : null;
  const lastName = typeof metadata.family_name === "string" ? metadata.family_name : null;
  const displayName = typeof metadata.full_name === "string" ? metadata.full_name : [firstName, lastName].filter(Boolean).join(" ") || null;
  const avatarUrl = typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

  const { freePlan } = await ensureSystemDefaults();
  return getDb().profile.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email, firstName, lastName, displayName, avatarUrl, lastLoginAt: new Date(), planId: freePlan.id },
    update: { email: user.email, firstName, lastName, displayName, avatarUrl, lastLoginAt: new Date(), deletedAt: null },
  });
}
