import type { Prisma, PrismaClient } from "../../../generated/prisma/client.ts";
import { AdminServiceError } from "./errors.ts";

export type RoomTypeMutation = {
  name: string;
  nameEn: string;
  nameUz: string | null;
  promptModifier: string;
  active: boolean;
  sortOrder: number;
};

async function ensureAnotherActiveRoom(
  tx: Prisma.TransactionClient,
  id: string,
) {
  const activeCount = await tx.roomType.count({
    where: { active: true, id: { not: id } },
  });
  if (activeCount === 0) {
    throw new AdminServiceError(
      "ROOM_CATALOG_REQUIRES_ACTIVE_ITEM",
      "Нельзя отключить последнюю активную комнату",
      409,
    );
  }
}

export function createRoomTypeWithDatabase(
  db: Pick<PrismaClient, "$transaction">,
  input: RoomTypeMutation & { code: string },
) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('room-types', 0))`;
    return tx.roomType.create({ data: input });
  });
}

export function updateRoomTypeWithDatabase(
  db: Pick<PrismaClient, "$transaction">,
  id: string,
  input: Partial<RoomTypeMutation>,
) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('room-types', 0))`;
    const current = await tx.roomType.findUnique({ where: { id } });
    if (!current)
      throw new AdminServiceError("NOT_FOUND", "Комната не найдена", 404);
    if (current.active && input.active === false) {
      await ensureAnotherActiveRoom(tx, id);
    }
    return tx.roomType.update({ where: { id }, data: input });
  });
}

export function deactivateRoomTypeWithDatabase(
  db: Pick<PrismaClient, "$transaction">,
  id: string,
) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('room-types', 0))`;
    const current = await tx.roomType.findUnique({ where: { id } });
    if (!current)
      throw new AdminServiceError("NOT_FOUND", "Комната не найдена", 404);
    if (!current.active) return current;
    await ensureAnotherActiveRoom(tx, id);
    return tx.roomType.update({ where: { id }, data: { active: false } });
  });
}
