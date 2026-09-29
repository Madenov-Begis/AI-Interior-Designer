import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { getDb } from "../../src/server/shared/db/prisma";
import { getStorage } from "../../src/server/shared/storage";
import { serverEnv } from "../../src/server/shared/config/env";
import { createNativeSession } from "../../src/server/features/auth/native-session-operations";
import { adjustCreditBalance } from "../../src/server/features/credits/service-operations";

const env = serverEnv();
if (env.LOAD_TEST_MODE !== "true" || env.AI_PROVIDER !== "fake")
  throw new Error("Требуется изолированный fake-контур");
const db = getDb();
const count = Number(process.env.LOAD_USERS || 100);
if (!Number.isInteger(count) || count < 1 || count > 1000)
  throw new Error("LOAD_USERS=1..1000");
const directory = process.env.LOAD_OUTPUT || ".data/load";
try {
  await mkdir(directory, { recursive: true });
  const image = await sharp({
    create: { width: 2048, height: 1536, channels: 3, background: "#a0b090" },
  })
    .png()
    .toBuffer();
  await writeFile(`${directory}/source.png`, image);
  // Несжимаемые данные дают реалистичный верхний профиль входного файла.
  const { randomBytes } = await import("node:crypto");
  const large = await sharp(randomBytes(2400 * 2400 * 3), {
    raw: { width: 2400, height: 2400, channels: 3 },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
  await writeFile(`${directory}/large.jpg`, large);
  const room = await db.roomType.upsert({
    where: { code: "load-test-room" },
    create: {
      code: "load-test-room",
      name: "Тестовая комната",
      promptModifier: "Тестовое помещение",
      active: true,
    },
    update: {},
  });
  const users = [];
  for (let i = 0; i < count; i++) {
    const id = randomUUID();
    await db.profile.create({
      data: {
        id,
        email: `${id}@example.invalid`,
        displayName: `Нагрузка ${i + 1}`,
        canvasOnboardingVersion: 1,
      },
    });
    await db.$transaction((tx) =>
      adjustCreditBalance(tx, {
        userId: id,
        actorId: id,
        amount: 1000,
        reason: "Изолированный нагрузочный тест",
        idempotencyKey: `load:${id}`,
      }),
    );
    const path = `users/${id}/load/source.png`;
    const uploaded = await getStorage()
      .from("source-images")
      .upload(path, image, { contentType: "image/png", upsert: false });
    if (uploaded.error) throw uploaded.error;
    const file = await db.mediaFile.create({
      data: {
        ownerId: id,
        path,
        bucket: "source-images",
        mimeType: "image/png",
        sizeBytes: image.byteLength,
        width: 2048,
        height: 1536,
        type: "SOURCE_IMAGE",
      },
    });
    const project = await db.project.create({
      data: {
        userId: id,
        name: "Проверка параллельных генераций",
        sourceImageId: file.id,
        status: "READY",
      },
    });
    const session = await createNativeSession(db, id, {
      secret: env.AUTH_SESSION_SECRET!,
      issuer: env.APP_URL,
    });
    users.push({
      userId: id,
      projectId: project.id,
      token: session.access_token,
      refreshToken: session.refresh_token,
      createdAt: Date.now(),
    });
  }
  await writeFile(
    `${directory}/users.json`,
    JSON.stringify({ roomTypeId: room.id, users }),
    { mode: 0o600 },
  );
  console.log(JSON.stringify({ users: count, directory }));
} finally {
  await db.$disconnect();
}
