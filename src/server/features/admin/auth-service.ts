import "server-only";

import { getDb } from "@/server/shared/db/prisma";
import { UnauthorizedError } from "@/server/features/auth/current-user";
import { issueAdminToken, matchesAdminAccessCode } from "./admin-token";

export async function loginAdminWithAccessCode(code: string) {
  if (!matchesAdminAccessCode(code))
    throw new UnauthorizedError("Неверный код доступа");

  const profile = await getDb().profile.findFirst({
    where: { role: "ADMIN", status: "ACTIVE", deletedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (!profile) throw new UnauthorizedError("Администратор не настроен");

  await getDb().profile.update({
    where: { id: profile.id },
    data: { lastLoginAt: new Date() },
  });

  return issueAdminToken(profile.id);
}

