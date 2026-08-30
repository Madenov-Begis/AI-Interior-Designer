import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/server/shared/config/env";
import { SUPABASE_ROOT_2021_CA } from "./supabase-ca";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getDb(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const adapter = new PrismaPg({
    connectionString: serverEnv().DATABASE_URL,
    ssl: {
      ca: SUPABASE_ROOT_2021_CA,
      rejectUnauthorized: true,
    },
  });
  const prisma = new PrismaClient({ adapter });
  globalForPrisma.prisma = prisma;
  return prisma;
}
