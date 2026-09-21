import "server-only";

import { getDb } from "@/server/shared/db/prisma";
import type { Locale } from "@/i18n/routing";
import { listActiveRoomTypesWithDatabase } from "./operations";

export function listActiveRoomTypes(locale: Locale) {
  return listActiveRoomTypesWithDatabase(getDb(), locale);
}
