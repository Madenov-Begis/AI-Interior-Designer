import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireIsolatedTestDatabase } from "../../src/server/shared/db/test-database.ts";
import {
  createNativeSession,
  refreshNativeSession,
  nativeUserFromAccessToken,
  InvalidSessionError,
} from "../../src/server/features/auth/native-session-operations.ts";
import { resolveGoogleIdentity } from "../../src/server/features/auth/google-identity-operations.ts";

test("Google identity и конкурентный refresh сохраняют единственный профиль, grant и successor", async () => {
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: requireIsolatedTestDatabase(
        process.env.TEST_DATABASE_URL,
      ),
      ssl: false,
    }),
  });
  const subject = randomUUID();
  const identity = {
    subject,
    email: `${subject}@example.invalid`,
    name: "Тестовый пользователь",
  };
  let userId: string | undefined;
  try {
    const profiles = await Promise.all(
      Array.from({ length: 4 }, () => resolveGoogleIdentity(db, identity)),
    );
    userId = profiles[0].id;
    assert.equal(new Set(profiles.map((p) => p.id)).size, 1);
    assert.equal(
      await db.creditTransaction.count({
        where: { userId, kind: "SIGNUP_GRANT" },
      }),
      1,
    );
    assert.equal(
      (await db.creditWallet.findUniqueOrThrow({ where: { userId } })).balance,
      10,
    );
    // Другой Google sub с тем же email не присоединяется к существующему профилю.
    await assert.rejects(
      resolveGoogleIdentity(db, { ...identity, subject: randomUUID() }),
    );
    const config = {
      secret: "test-session-secret".repeat(4),
      issuer: "https://example.invalid",
    };
    const now = Date.now();
    const session = await createNativeSession(db, userId, config, now);
    const refreshed = await Promise.all(
      Array.from({ length: 8 }, () =>
        refreshNativeSession(db, session.refresh_token, config, now + 1000),
      ),
    );
    assert.equal(new Set(refreshed.map((s) => s.refresh_token)).size, 1);
    assert.notEqual(refreshed[0].refresh_token, session.refresh_token);
    assert.equal(
      (
        await nativeUserFromAccessToken(
          db,
          refreshed[0].access_token,
          config,
          now + 2000,
        )
      ).id,
      userId,
    );
    await assert.rejects(
      refreshNativeSession(db, session.refresh_token, config, now + 40_000),
      InvalidSessionError,
    );
    await assert.rejects(
      nativeUserFromAccessToken(
        db,
        refreshed[0].access_token,
        config,
        now + 40_000,
      ),
      InvalidSessionError,
    );
    await db.profile.update({
      where: { id: userId },
      data: { status: "BLOCKED" },
    });
    await assert.rejects(resolveGoogleIdentity(db, identity));
  } finally {
    if (userId) {
      await db.creditTransaction.deleteMany({ where: { userId } });
      await db.profile.delete({ where: { id: userId } });
    }
    await db.$disconnect();
  }
});
