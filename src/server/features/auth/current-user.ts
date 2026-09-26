import "server-only";

import { getDb } from "@/server/shared/db/prisma";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { nativeSessionConfig } from "./native-config";
import {
  nativeUserFromAccessToken,
  InvalidSessionError,
} from "./native-session-operations";
import type { CurrentUser } from "@/server/features/auth/claims";

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
  try {
    return await nativeUserFromAccessToken(
      getDb(),
      token,
      nativeSessionConfig(),
    );
  } catch (error) {
    if (error instanceof InvalidSessionError) throw new UnauthorizedError();
    throw error;
  }
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

/** Проверяет Bearer и подтверждает доступ активного профиля. */
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
