import "server-only";

import { getDb } from "@/lib/db";
import { requireCurrentUser, requireCurrentUserFromBearer, UnauthorizedError } from "@/lib/auth/current-user";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";

export class ForbiddenError extends Error {
  constructor(message = "Недостаточно прав") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireAdmin(request?: NextRequest) {
  const requestHeaders = request?.headers ?? await headers();
  const localPhone = requestHeaders.get("authorization")?.match(/^AdminPhone\s+(\+998\d{9})$/)?.[1];
  if (localPhone) {
    if (process.env.NODE_ENV === "production") throw new UnauthorizedError("Локальный вход отключён");
    const profile = await getDb().profile.findUnique({ where: { phone: localPhone } });
    if (!profile || profile.role !== "ADMIN" || profile.status !== "ACTIVE") throw new ForbiddenError();
    return { user: { id: profile.id, email: profile.email, user_metadata: {} }, profile };
  }
  const user = requestHeaders.get("authorization")
    ? await requireCurrentUserFromBearer(request ?? requestHeaders)
    : await requireCurrentUser();
  const profile = await getDb().profile.findUnique({ where: { id: user.id } });
  if (!profile || profile.role !== "ADMIN" || profile.status !== "ACTIVE") throw new ForbiddenError();
  return { user, profile };
}
