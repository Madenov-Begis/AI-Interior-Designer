import "server-only";

import {
  createRoomTypeWithDatabase,
  deactivateRoomTypeWithDatabase,
  type RoomTypeMutation,
  updateRoomTypeWithDatabase,
} from "./room-type-operations";
import { getDb } from "@/server/shared/db/prisma";

function roomTypeDto(item: {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  nameUz: string | null;
  promptModifier: string;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function listAdminRoomTypes() {
  const items = await getDb().roomType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { code: "asc" }],
  });
  return { items: items.map(roomTypeDto) };
}

export async function createAdminRoomType(
  input: RoomTypeMutation & { code: string },
) {
  return roomTypeDto(await createRoomTypeWithDatabase(getDb(), input));
}

export async function updateAdminRoomType(
  id: string,
  input: Partial<RoomTypeMutation>,
) {
  return roomTypeDto(await updateRoomTypeWithDatabase(getDb(), id, input));
}

export async function deactivateAdminRoomType(id: string) {
  return roomTypeDto(await deactivateRoomTypeWithDatabase(getDb(), id));
}
