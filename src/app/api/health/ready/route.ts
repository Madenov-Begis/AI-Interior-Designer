import { access, constants } from "node:fs/promises";
import { getDb } from "@/server/shared/db/prisma";
import { serverEnv } from "@/server/shared/config/env";
import { getStorage } from "@/server/shared/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const env = serverEnv();
    await getDb().$queryRaw`SELECT 1`;
    await getDb().authSession.findFirst({ select: { id: true } });
    getStorage();
    await access(env.STORAGE_ROOT!, constants.R_OK | constants.W_OK);
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
