import "server-only";

import { getDb } from "@/lib/db";
import { requireCurrentUser } from "@/lib/auth/current-user";

export class ForbiddenError extends Error {
  constructor(message = "Недостаточно прав") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireAdmin() {
  const user = await requireCurrentUser();
  const profile = await getDb().profile.findUnique({ where: { id: user.id } });
  if (!profile || profile.role !== "ADMIN" || profile.status !== "ACTIVE") throw new ForbiddenError();
  return { user, profile };
}
