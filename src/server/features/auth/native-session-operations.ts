import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../../../generated/prisma/client.ts";
import {
  ACCESS_SECONDS,
  SESSION_SECONDS,
  REFRESH_GRACE_MS,
  refreshToken,
  refreshSessionId,
  refreshDecision,
  matchesHash,
  tokenHash,
  signAccessToken,
  verifyAccessToken,
} from "./session-tokens.ts";

export class InvalidSessionError extends Error {
  constructor() {
    super("INVALID_SESSION");
    this.name = "InvalidSessionError";
  }
}
type SessionConfig = { secret: string; issuer: string };
type SessionRow = {
  id: string;
  userId: string;
  refreshVersion: number;
  expiresAt: Date;
};

async function sessionPayload(
  row: SessionRow,
  config: SessionConfig,
  now: number,
) {
  const expiresIn = Math.min(
    ACCESS_SECONDS,
    Math.floor((row.expiresAt.getTime() - now) / 1000),
  );
  if (expiresIn <= 0) throw new InvalidSessionError();
  return {
    access_token: await signAccessToken(
      row.userId,
      row.id,
      config.secret,
      config.issuer,
      now,
      expiresIn,
    ),
    refresh_token: refreshToken(row.id, row.refreshVersion, config.secret),
    expires_in: expiresIn,
    refresh_expires_in: Math.max(
      1,
      Math.floor((row.expiresAt.getTime() - now) / 1000),
    ),
  };
}

export async function createNativeSession(
  db: PrismaClient,
  userId: string,
  config: SessionConfig,
  now = Date.now(),
) {
  const id = randomUUID();
  const row = await db.authSession.create({
    data: {
      id,
      userId,
      refreshHash: tokenHash(refreshToken(id, 0, config.secret)),
      expiresAt: new Date(now + SESSION_SECONDS * 1000),
    },
  });
  return sessionPayload(row, config, now);
}

export async function refreshNativeSession(
  db: PrismaClient,
  token: string,
  config: SessionConfig,
  now = Date.now(),
) {
  const id = refreshSessionId(token);
  if (!id) throw new InvalidSessionError();
  const row = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "AuthSession" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const session = await tx.authSession.findUnique({
      where: { id },
      include: { user: { select: { status: true, deletedAt: true } } },
    });
    if (!session || session.user.status !== "ACTIVE" || session.user.deletedAt)
      return null;
    const decision = refreshDecision(session, token, now);
    if (decision === "invalid") return null;
    if (decision === "revoke") {
      await tx.authSession.update({
        where: { id },
        data: { revokedAt: new Date(now) },
      });
      return null;
    }
    if (decision === "reuse") return session;
    const version = session.refreshVersion + 1;
    return tx.authSession.update({
      where: { id },
      data: {
        refreshVersion: version,
        refreshHash: tokenHash(refreshToken(id, version, config.secret)),
        previousRefreshHash: session.refreshHash,
        previousValidUntil: new Date(now + REFRESH_GRACE_MS),
      },
    });
  });
  if (!row) throw new InvalidSessionError();
  return sessionPayload(row, config, now);
}

export async function nativeUserFromAccessToken(
  db: PrismaClient,
  token: string,
  config: SessionConfig,
  now = Date.now(),
) {
  let claims: Awaited<ReturnType<typeof verifyAccessToken>>;
  try {
    claims = await verifyAccessToken(token, config.secret, config.issuer, now);
  } catch {
    throw new InvalidSessionError();
  }
  const session = await db.authSession.findFirst({
    where: {
      id: claims.sessionId,
      userId: claims.userId,
      revokedAt: null,
      expiresAt: { gt: new Date(now) },
      user: { status: "ACTIVE", deletedAt: null },
    },
    include: { user: true },
  });
  if (!session) throw new InvalidSessionError();
  return {
    id: session.userId,
    email: session.user.email,
    user_metadata: {
      given_name: session.user.firstName,
      family_name: session.user.lastName,
      full_name: session.user.displayName,
      avatar_url: session.user.avatarUrl,
    },
  };
}

export async function revokeNativeSession(
  db: PrismaClient,
  refresh: string | undefined,
  access: string | undefined,
  config: SessionConfig,
  now = Date.now(),
) {
  const ids = new Set<string>();
  if (refresh) {
    const id = refreshSessionId(refresh);
    if (id) {
      const row = await db.authSession.findUnique({ where: { id } });
      if (
        row &&
        (matchesHash(refresh, row.refreshHash) ||
          matchesHash(refresh, row.previousRefreshHash))
      )
        ids.add(id);
    }
  }
  if (access) {
    try {
      ids.add(
        (await verifyAccessToken(access, config.secret, config.issuer, now))
          .sessionId,
      );
    } catch {
      /* Недействующий access token не мешает отзыву по refresh. */
    }
  }
  if (ids.size)
    await db.authSession.updateMany({
      where: { id: { in: [...ids] }, revokedAt: null },
      data: { revokedAt: new Date(now) },
    });
}
