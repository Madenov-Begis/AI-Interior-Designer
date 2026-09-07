import type { PrismaClient } from "../../../generated/prisma/client.ts";
import { AdminServiceError } from "./errors.ts";
import {
  adminAccessViolation,
  removesActiveAdminAccess,
} from "./user-access-policy.ts";

export async function updateAdminAccess(
  db: Pick<PrismaClient, "$transaction">,
  actorId: string,
  id: string,
  input: {
    role?: "USER" | "ADMIN";
    status?: "ACTIVE" | "BLOCKED" | "DELETED";
  },
) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('admin-access', 0))`;
    const actor = await tx.profile.findFirst({
      where: { id: actorId, role: "ADMIN", status: "ACTIVE", deletedAt: null },
      select: { id: true },
    });
    if (!actor)
      throw new AdminServiceError(
        "FORBIDDEN",
        "Административный доступ отозван",
        403,
      );
    const current = await tx.profile.findUnique({ where: { id } });
    if (!current)
      throw new AdminServiceError("NOT_FOUND", "Пользователь не найден", 404);
    const removesAdminAccess = removesActiveAdminAccess({
      currentRole: current.role,
      currentStatus: current.status,
      nextRole: input.role,
      nextStatus: input.status,
    });
    if (
      adminAccessViolation({
        actorId,
        targetId: id,
        removesAccess: removesAdminAccess,
        otherActiveAdmins: 1,
      }) === "SELF_LOCKOUT"
    )
      throw new AdminServiceError(
        "SELF_LOCKOUT",
        "Нельзя лишить себя административного доступа",
        409,
      );
    if (removesAdminAccess) {
      const otherAdmins = await tx.profile.count({
        where: {
          id: { not: id },
          role: "ADMIN",
          status: "ACTIVE",
          deletedAt: null,
        },
      });
      if (
        adminAccessViolation({
          actorId,
          targetId: id,
          removesAccess: true,
          otherActiveAdmins: otherAdmins,
        }) === "LAST_ADMIN"
      )
        throw new AdminServiceError(
          "LAST_ADMIN",
          "Нельзя заблокировать или понизить последнего активного администратора",
          409,
        );
    }
    const updated = await tx.profile.update({
      where: { id },
      data: {
        role: input.role,
        status: input.status,
        deletedAt:
          input.status === "DELETED"
            ? new Date()
            : input.status
              ? null
              : undefined,
      },
    });
    return updated;
  });
}
