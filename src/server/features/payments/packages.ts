import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/shared/db/prisma";

const publicPackageSelect = {
  code: true,
  name: true,
  description: true,
  credits: true,
  priceUzs: true,
  popular: true,
} satisfies Prisma.CreditPackageSelect;

export function listActiveCreditPackages() {
  return getDb().creditPackage.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { credits: "asc" }, { code: "asc" }],
    select: publicPackageSelect,
  });
}

export function getActiveCreditPackage(code: string) {
  return getDb().creditPackage.findFirst({
    where: { code, active: true },
    select: publicPackageSelect,
  });
}
