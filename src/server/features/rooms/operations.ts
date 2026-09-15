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
      select: { id: true; code: true; name: true };
    }): Promise<PublicRoomType[]>;
  };
};

export function listActiveRoomTypesWithDatabase(db: RoomCatalogDatabase) {
  return db.roomType.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { code: "asc" }],
    select: { id: true, code: true, name: true },
  });
}
