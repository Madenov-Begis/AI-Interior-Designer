import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getDb } from "@/server/shared/db/prisma";
import { getStorage } from "@/server/shared/storage";
import { STORAGE_BUCKETS } from "@/server/shared/config/storage";
import { createNativeSession } from "@/server/features/auth/native-session-operations";
import { nativeSessionConfig } from "@/server/features/auth/native-config";

async function main() {
  const args = process.argv.slice(2);
  const usersIndex = args.indexOf("--users");
  const count = usersIndex !== -1 && args[usersIndex + 1] ? Number(args[usersIndex + 1]) : 50;

  console.log(`Подготовка тестовых данных для ${count} пользователей...`);
  const db = getDb();
  const storage = getStorage();
  const sessionConfig = nativeSessionConfig();

  // Создаём минимальное валидное PNG-изображение для исходной комнаты
  const sourceImageBuffer = await sharp({
    create: {
      width: 1024,
      height: 768,
      channels: 3,
      background: { r: 180, g: 190, b: 205 },
    },
  })
    .png()
    .toBuffer();

  const preparedUsers: Array<{
    userId: string;
    projectId: string;
    sourceImageId: string;
    accessToken: string;
  }> = [];

  for (let i = 0; i < count; i++) {
    const userId = randomUUID();
    const projectId = randomUUID();
    const sourceImageId = randomUUID();
    const sourcePath = `users/${userId}/source/${sourceImageId}.png`;

    // Загружаем тестовое изображение в Storage
    const uploadResult = await storage
      .from(STORAGE_BUCKETS.sourceImages)
      .upload(sourcePath, sourceImageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadResult.error) {
      throw new Error(`Ошибка загрузки изображения: ${uploadResult.error.message}`);
    }

    // Создаём пользователя с балансом кредитов, медиа-файлом и проектом
    await db.$transaction(async (tx) => {
      await tx.profile.create({
        data: {
          id: userId,
          role: "USER",
          status: "ACTIVE",
          displayName: `Load Test User ${i + 1}`,
          email: `loadtest-${userId}@example.invalid`,
          creditWallet: {
            create: {
              balance: 100,
            },
          },
        },
      });

      await tx.mediaFile.create({
        data: {
          id: sourceImageId,
          ownerId: userId,
          bucket: STORAGE_BUCKETS.sourceImages,
          path: sourcePath,
          originalName: "room-source.png",
          mimeType: "image/png",
          extension: "png",
          sizeBytes: sourceImageBuffer.byteLength,
          width: 1024,
          height: 768,
          type: "SOURCE_IMAGE",
        },
      });

      await tx.project.create({
        data: {
          id: projectId,
          userId,
          name: `Load Test Project ${i + 1}`,
          sourceImageId,
        },
      });
    });

    const session = await createNativeSession(db, userId, sessionConfig, Date.now());

    preparedUsers.push({
      userId,
      projectId,
      sourceImageId,
      accessToken: session.access_token,
    });

    if ((i + 1) % 10 === 0 || i + 1 === count) {
      console.log(`Подготовлено ${i + 1} из ${count} пользователей...`);
    }
  }

  const outputPath = resolve(process.cwd(), "tests/load/load-test-users.json");
  await writeFile(outputPath, JSON.stringify(preparedUsers, null, 2), "utf8");

  console.log(`✅ Тестовые данные сохранены в ${outputPath}`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error("Ошибка при подготовке тестовых данных:", err);
  process.exit(1);
});
