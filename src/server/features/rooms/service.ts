import "server-only";

import { getDb } from "@/server/shared/db/prisma";
import { listActiveRoomTypesWithDatabase } from "./operations";

export function listActiveRoomTypes() {
  return listActiveRoomTypesWithDatabase(getDb());
}
