import type { PrismaClient } from "../../../generated/prisma/client.ts";
import { AdminServiceError } from "./errors.ts";

export type CreditPackageMutation = {
  name: string;
  nameEn: string;
  nameUz: string | null;
  description: string | null;
  descriptionEn: string | null;
  descriptionUz: string | null;
  credits: number;
  priceUzs: number;
  popular: boolean;
  active: boolean;
  sortOrder: number;
};

export async function createCreditPackageWithDatabase(
  db: Pick<PrismaClient, "$transaction">,
  input: CreditPackageMutation & { code: string },
) {
  const item = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('credit-packages', 0))`;
    if (input.popular && input.active) {
      await tx.creditPackage.updateMany({
        where: { popular: true },
        data: { popular: false },
      });
    }
    return tx.creditPackage.create({ data: input });
  });
  return item;
}

export async function updateCreditPackageWithDatabase(
  db: Pick<PrismaClient, "$transaction">,
  id: string,
  input: Partial<CreditPackageMutation>,
) {
  const item = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('credit-packages', 0))`;
    const current = await tx.creditPackage.findUnique({ where: { id } });
    if (!current)
      throw new AdminServiceError("NOT_FOUND", "Пакет не найден", 404);

    const active = input.active ?? current.active;
    const popular = active ? (input.popular ?? current.popular) : false;
    if (popular) {
      await tx.creditPackage.updateMany({
        where: { popular: true, id: { not: id } },
        data: { popular: false },
      });
    }
    return tx.creditPackage.update({
      where: { id },
      data: { ...input, popular },
    });
  });
  return item;
}
