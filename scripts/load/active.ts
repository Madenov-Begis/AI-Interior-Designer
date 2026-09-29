import { getDb } from "../../src/server/shared/db/prisma";
import { serverEnv } from "../../src/server/shared/config/env";
const env = serverEnv();
if (env.LOAD_TEST_MODE !== "true" || env.AI_PROVIDER !== "fake")
  throw new Error("Только тестовый контур");
const db = getDb();
try {
  const sending = await db.generationExecution.count({
    where: { stage: "SENDING", generation: { status: "PROCESSING" } },
  });
  console.log(JSON.stringify({ sending }));
  if (!sending) process.exitCode = 1;
} finally {
  await db.$disconnect();
}
