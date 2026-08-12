import "server-only";

import { getDb } from "@/server/shared/db/prisma";
import {
  requireCurrentUser,
  requireCurrentUserFromBearer,
  UnauthorizedError,
} from "@/server/features/auth/current-user";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { getLocalAdminPhone } from "@/server/features/admin/admin-phone";
import { verifyAdminToken } from "@/server/features/admin/admin-token";

export class ForbiddenError extends Error {
  constructor(message = "Недостаточно прав") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireAdmin(request?: NextRequest) {
  const requestHeaders = request?.headers ?? (await headers());
  const local = getLocalAdminPhone(
    requestHeaders.get("authorization"),
    process.env.NODE_ENV,
  );
  const localPhone = local.phone;
  if (local.disabled) throw new UnauthorizedError("Локальный вход отключён");
  if (localPhone) {
    const profile = await getDb().profile.findUnique({
      where: { phone: localPhone },
    });
    if (!profile || profile.role !== "ADMIN" || profile.status !== "ACTIVE")
      throw new ForbiddenError();
    return {
      user: { id: profile.id, email: profile.email, user_metadata: {} },
      profile,
    };
  }
  const authorization = requestHeaders.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/)?.[1];
  if (bearer?.startsWith("ra1.")) {
    const token = verifyAdminToken(bearer);
    if (!token) throw new UnauthorizedError("Сессия администратора истекла");
    const profile = await getDb().profile.findUnique({
      where: { id: token.subject },
    });
    if (
      !profile ||
      profile.role !== "ADMIN" ||
      profile.status !== "ACTIVE" ||
      profile.deletedAt
    )
      throw new ForbiddenError();
    return {
      user: { id: profile.id, email: profile.email, user_metadata: {} },
      profile,
    };
  }
  const user = authorization
    ? await requireCurrentUserFromBearer(request ?? requestHeaders)
    : await requireCurrentUser();
  const profile = await getDb().profile.findUnique({ where: { id: user.id } });
  if (!profile || profile.role !== "ADMIN" || profile.status !== "ACTIVE")
    throw new ForbiddenError();
  return { user, profile };
}
