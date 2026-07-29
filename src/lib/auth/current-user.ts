import "server-only";

import { getDb } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSystemDefaults } from "@/features/plans/defaults";
import { ensureCreditWallet } from "@/features/credits/service";
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
  if (!user.email) throw new Error("Google account did not provide an email");

  const metadata = user.user_metadata ?? {};
  const firstName = typeof metadata.given_name === "string" ? metadata.given_name : null;
  const lastName = typeof metadata.family_name === "string" ? metadata.family_name : null;
  const displayName = typeof metadata.full_name === "string" ? metadata.full_name : [firstName, lastName].filter(Boolean).join(" ") || null;
  const avatarUrl = typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

  const { freePlan } = await ensureSystemDefaults();
  const db = getDb();
  let profile = await db.profile.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email, firstName, lastName, displayName, avatarUrl, lastLoginAt: new Date(), planId: freePlan.id },
    update: { email: user.email, firstName, lastName, displayName, avatarUrl, lastLoginAt: new Date(), deletedAt: null },
  });
  if (!profile.planId) {
    profile = await db.profile.update({
      where: { id: profile.id },
      data: { planId: freePlan.id },
    });
  }
  await db.$transaction((tx) => ensureCreditWallet(tx, profile.id));
  return profile;
}
