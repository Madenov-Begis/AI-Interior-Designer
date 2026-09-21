import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/shared/db/prisma";
import type { Locale } from "@/i18n/routing";
import {
  localizedName,
  localizedOptionalText,
} from "@/server/shared/i18n/catalog";

const publicPackageSelect = {
  code: true,
  name: true,
  nameEn: true,
  nameUz: true,
  description: true,
  descriptionEn: true,
  descriptionUz: true,
  credits: true,
  priceUzs: true,
  popular: true,
} satisfies Prisma.CreditPackageSelect;

export async function listActiveCreditPackages(locale: Locale) {
  const items = await getDb().creditPackage.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { credits: "asc" }, { code: "asc" }],
    select: publicPackageSelect,
  });
  return items.map(
    ({ nameEn, nameUz, descriptionEn, descriptionUz, ...item }) => ({
      ...item,
      name: localizedName({ ...item, nameEn, nameUz }, locale),
      description: localizedOptionalText(
        { ...item, descriptionEn, descriptionUz },
        locale,
      ),
    }),
  );
}

export function getActiveCreditPackage(code: string) {
  return getDb().creditPackage.findFirst({
    where: { code, active: true },
    select: publicPackageSelect,
  });
}
