import type { Locale } from "@/i18n/routing";
import { localizedName } from "../../shared/i18n/catalog.ts";

export type PublicRoomType = {
  id: string;
  code: string;
  name: string;
};

type RoomCatalogDatabase = {
  roomType: {
    findMany(input: {
      where: { active: true };
      orderBy: Array<{ sortOrder: "asc" } | { name: "asc" } | { code: "asc" }>;
      select: { id: true; code: true; name: true; nameEn: true; nameUz: true };
    }): Promise<
      Array<PublicRoomType & { nameEn: string | null; nameUz: string | null }>
    >;
  };
};

export async function listActiveRoomTypesWithDatabase(
  db: RoomCatalogDatabase,
  locale: Locale = "en",
) {
  const items = await db.roomType.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { code: "asc" }],
    select: { id: true, code: true, name: true, nameEn: true, nameUz: true },
  });
  return items.map(({ nameEn, nameUz, ...item }) => ({
    ...item,
    name: localizedName({ ...item, nameEn, nameUz }, locale),
  }));
}
