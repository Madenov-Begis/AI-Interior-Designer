import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

type UserData = {
  userId: string;
  projectId: string;
  sourceImageId: string;
  accessToken: string;
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function main() {
  const args = process.argv.slice(2);
  const vusIdx = args.indexOf("--vus");
  const targetVUs = vusIdx !== -1 && args[vusIdx + 1] ? Number(args[vusIdx + 1]) : 20;

  const urlIdx = args.indexOf("--url");
  const baseUrl = urlIdx !== -1 && args[urlIdx + 1] ? args[urlIdx + 1] : "http://localhost:3000";

  console.log(`\n======================================================`);
  console.log(`🚀 Нагрузочный тест генераций: ${targetVUs} параллельных пользователей`);
  console.log(`🌐 Целевой URL: ${baseUrl}`);
  console.log(`======================================================\n`);

  const usersPath = resolve(process.cwd(), "tests/load/load-test-users.json");
  let users: UserData[];
  try {
    const raw = await readFile(usersPath, "utf8");
    users = JSON.parse(raw);
  } catch {
    console.error(`❌ Не удалось прочитать ${usersPath}.`);
    console.error("Сначала запустите: node --experimental-strip-types scripts/prepare-load-test.ts --users " + targetVUs);
    process.exit(1);
  }

  if (users.length < targetVUs) {
    console.warn(`⚠️ В файле пользователей меньше (${users.length}), чем запрошено (${targetVUs}). Используем ${users.length}.`);
  }
  const testUsers = users.slice(0, targetVUs);

  const dispatchLatencies: number[] = [];
  const queueWaitLatencies: number[] = [];
  const totalDurations: number[] = [];
  let successful = 0;
  let failed = 0;
  let throttled429 = 0;
  let capacity503 = 0;

  const startTime = Date.now();

  const userTasks = testUsers.map(async (user, index) => {
    const vu = index + 1;
    const taskStart = Date.now();
    const idempotencyKey = randomUUID();

    const boundary = "----loadTestBoundary" + randomUUID();
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="prompt"\r\n\r\n` +
      `Скандинавская светлая спальня, нагрузочный тест VU #${vu}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="aspectRatio"\r\n\r\n` +
      `RATIO_1_1\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="visualPromptAction"\r\n\r\n` +
      `clear\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="overlayPresent"\r\n\r\n` +
      `false\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="canvasStatePresent"\r\n\r\n` +
      `false\r\n` +
      `--${boundary}--\r\n`;

    try {
      const dispatchRes = await fetch(`${baseUrl}/api/v1/projects/${user.projectId}/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "idempotency-key": idempotencyKey,
        },
        body,
      });

      const dispatchTime = Date.now() - taskStart;
      dispatchLatencies.push(dispatchTime);

      if (dispatchRes.status === 429) {
        throttled429++;
        failed++;
        console.warn(`[VU ${vu}] Получен 429 Too Many Requests`);
        return;
      }
      if (dispatchRes.status === 503) {
        capacity503++;
        failed++;
        console.warn(`[VU ${vu}] Получен 503 Capacity Busy`);
        return;
      }

      if (dispatchRes.status !== 201) {
        failed++;
        const text = await dispatchRes.text();
        console.error(`[VU ${vu}] Ошибка отправки: HTTP ${dispatchRes.status} — ${text.slice(0, 150)}`);
        return;
      }

      const payload = (await dispatchRes.json()) as { data?: { generation?: { id: string } }; generation?: { id: string } };
      const generationId = payload?.data?.generation?.id || payload?.generation?.id;
      if (!generationId) {
        failed++;
        console.error(`[VU ${vu}] В ответе нет generationId`);
        return;
      }

      // Опрос раз в 2 секунды
      let firstProcessingAt = 0;
      const deadline = Date.now() + 15 * 60 * 1000;

      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(`${baseUrl}/api/v1/generations/${generationId}`, {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        });

        if (pollRes.status !== 200) continue;
        const pollPayload = (await pollRes.json()) as { data?: { generation?: { status: string } }; generation?: { status: string } };
        const status = pollPayload?.data?.generation?.status || pollPayload?.generation?.status;

        if (status === "PROCESSING" && !firstProcessingAt) {
          firstProcessingAt = Date.now();
          queueWaitLatencies.push(firstProcessingAt - taskStart);
        }

        if (status === "SUCCEEDED") {
          const totalTime = Date.now() - taskStart;
          totalDurations.push(totalTime);
          successful++;
          return;
        }

        if (status === "FAILED" || status === "REJECTED" || status === "CANCELLED") {
          failed++;
          console.warn(`[VU ${vu}] Генерация завершилась со статусом: ${status}`);
          return;
        }
      }

      failed++;
      console.error(`[VU ${vu}] Превышен таймаут ожидания генерации`);
    } catch (err) {
      failed++;
      console.error(`[VU ${vu}] Ошибка выполнения:`, err);
    }
  });

  await Promise.all(userTasks);

  const testDurationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n======================================================`);
  console.log(`📊 ИТОГОВЫЙ ОТЧЁТ НАГРУЗОЧНОГО ТЕСТИРОВАНИЯ`);
  console.log(`======================================================`);
  console.log(`Общее время теста:         ${testDurationSec} сек`);
  console.log(`Запущено пользователей:    ${testUsers.length}`);
  console.log(`Успешно завершено:         ${successful} (${((successful / testUsers.length) * 100).toFixed(1)}%)`);
  console.log(`Ошибок / не завершилось:   ${failed}`);
  if (throttled429 > 0) console.log(`Ошибок 429 (Throttled):    ${throttled429}`);
  if (capacity503 > 0)  console.log(`Ошибок 503 (Capacity):     ${capacity503}`);
  console.log(`------------------------------------------------------`);
  console.log(`Время отправки задачи (Dispatch Latency):`);
  console.log(`  p50:  ${percentile(dispatchLatencies, 50)} мс`);
  console.log(`  p95:  ${percentile(dispatchLatencies, 95)} мс`);
  console.log(`  p99:  ${percentile(dispatchLatencies, 99)} мс`);
  console.log(`------------------------------------------------------`);
  console.log(`Ожидание в очереди (Queue Wait):`);
  console.log(`  p50:  ${(percentile(queueWaitLatencies, 50) / 1000).toFixed(1)} сек`);
  console.log(`  p95:  ${(percentile(queueWaitLatencies, 95) / 1000).toFixed(1)} сек`);
  console.log(`------------------------------------------------------`);
  console.log(`Полная длительность генерации (Total E2E Duration):`);
  console.log(`  p50:  ${(percentile(totalDurations, 50) / 1000).toFixed(1)} сек`);
  console.log(`  p95:  ${(percentile(totalDurations, 95) / 1000).toFixed(1)} сек`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error("Критическая ошибка запуска нагрузочного теста:", err);
  process.exit(1);
});
