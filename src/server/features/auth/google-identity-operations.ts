import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../../../generated/prisma/client.ts";
import { ensureCreditWallet } from "../credits/service-operations.ts";

export type GoogleIdentity = {
  subject: string;
  email: string;
  givenName?: string;
  familyName?: string;
  name?: string;
  picture?: string;
};

export async function resolveGoogleIdentity(
  db: PrismaClient,
  identity: GoogleIdentity,
) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"google:" + identity.subject}, 0))`;
    const linked = await tx.authIdentity.findUnique({
      where: {
        provider_subject: { provider: "google", subject: identity.subject },
      },
      include: { user: true },
    });
    if (linked && (linked.user.status !== "ACTIVE" || linked.user.deletedAt))
      throw new Error("ACCOUNT_BLOCKED");
    const profileData = {
      email: identity.email,
      firstName: identity.givenName ?? null,
      lastName: identity.familyName ?? null,
      displayName: identity.name ?? null,
      avatarUrl: identity.picture ?? null,
      lastLoginAt: new Date(),
    };
    if (linked) {
      // Импортированный профиль обязан иметь перенесённый кошелёк. Не выдаём
      // signup grant повторно при неполной миграции финансовой истории.
      if (
        !(await tx.creditWallet.findUnique({
          where: { userId: linked.userId },
        }))
      )
        throw new Error("IDENTITY_MIGRATION_INCOMPLETE");
      return tx.profile.update({
        where: { id: linked.userId },
        data: profileData,
      });
    }
    const collision = await tx.profile.findFirst({
      where: { email: { equals: identity.email, mode: "insensitive" } },
      select: { id: true },
    });
    if (collision) throw new Error("IDENTITY_LINK_REQUIRED");
    const profile = await tx.profile.create({
      data: { id: randomUUID(), ...profileData },
    });
    await tx.authIdentity.create({
      data: {
        userId: profile.id,
        provider: "google",
        subject: identity.subject,
      },
    });
    await ensureCreditWallet(tx, profile.id);
    return profile;
  });
}
