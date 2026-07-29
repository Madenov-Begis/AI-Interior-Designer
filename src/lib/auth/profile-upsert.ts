import type { PrismaClient } from "../../generated/prisma/client.ts";
import { ensureCreditWallet } from "../../features/credits/service-operations.ts";
import type { CurrentUser } from "./claims.ts";

export async function upsertProfileFromAuthUserWithDatabase(
  db: PrismaClient,
  user: CurrentUser,
  freePlanId: string,
) {
  if (!user.email) {
    throw new Error("Google account did not provide an email");
  }

  const metadata = user.user_metadata ?? {};
  const firstName =
    typeof metadata.given_name === "string" ? metadata.given_name : null;
  const lastName =
    typeof metadata.family_name === "string"
      ? metadata.family_name
      : null;
  const displayName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : [firstName, lastName].filter(Boolean).join(" ") || null;
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

  let profile = await db.profile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      firstName,
      lastName,
      displayName,
      avatarUrl,
      lastLoginAt: new Date(),
      planId: freePlanId,
    },
    update: {
      email: user.email,
      firstName,
      lastName,
      displayName,
      avatarUrl,
      lastLoginAt: new Date(),
      deletedAt: null,
    },
  });
  if (!profile.planId) {
    profile = await db.profile.update({
      where: { id: profile.id },
      data: { planId: freePlanId },
    });
  }
  await db.$transaction((tx) => ensureCreditWallet(tx, profile.id));
  return profile;
}
