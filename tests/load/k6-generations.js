import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const usersData = JSON.parse(open("./load-test-users.json"));

const queueWaitTrend = new Trend("generation_queue_wait_ms");
const totalDurationTrend = new Trend("generation_total_duration_ms");
const dispatchSuccessRate = new Rate("dispatch_success_rate");
const generationSuccessRate = new Rate("generation_success_rate");
const throttled429Counter = new Counter("throttled_429_count");
const capacity503Counter = new Counter("capacity_503_count");

const targetVUs = Number(__ENV.TARGET_VUS || 20);
const baseUrl = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  scenarios: {
    generation_burst: {
      executor: "per-vu-iterations",
      vus: Math.min(targetVUs, usersData.length),
      iterations: 1,
      maxDuration: "15m",
    },
  },
  thresholds: {
    dispatch_success_rate: ["rate>0.95"],
    generation_success_rate: ["rate>0.90"],
  },
};

export default function loadTest() {
  const userIndex = (__VU - 1) % usersData.length;
  const user = usersData[userIndex];

  const idempotencyKey = `k6-${user.userId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const dispatchUrl = `${baseUrl}/api/v1/projects/${user.projectId}/generations`;

  const boundary = "----k6FormBoundary" + Math.random().toString(36).substring(2);
  const body =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="prompt"\r\n\r\n` +
    `Скандинавская гостиная, нагрузочный тест VU #${__VU}\r\n` +
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

  const dispatchParams = {
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "idempotency-key": idempotencyKey,
    },
    timeout: "30s",
  };

  const startTime = Date.now();
  const dispatchRes = http.post(dispatchUrl, body, dispatchParams);

  if (dispatchRes.status === 429) {
    throttled429Counter.add(1);
    dispatchSuccessRate.add(false);
    return;
  }
  if (dispatchRes.status === 503) {
    capacity503Counter.add(1);
    dispatchSuccessRate.add(false);
    return;
  }

  const dispatchOk = check(dispatchRes, {
    "dispatch status is 201": (r) => r.status === 201,
  });
  dispatchSuccessRate.add(dispatchOk);

  if (!dispatchOk) {
    console.error(`Ошибка отправки: HTTP ${dispatchRes.status} — ${dispatchRes.body}`);
    return;
  }

  const payload = dispatchRes.json();
  const generationId = payload?.data?.generation?.id || payload?.generation?.id;
  if (!generationId) {
    console.error("Не найден ID генерации в ответе:", dispatchRes.body);
    return;
  }

  // Опрос статуса генерации раз в 2 секунды
  const pollUrl = `${baseUrl}/api/v1/generations/${generationId}`;
  const pollParams = {
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
    },
    timeout: "10s",
  };

  let firstProcessingAt = 0;
  const maxPollTime = 15 * 60 * 1000; // 15 минут
  const deadline = Date.now() + maxPollTime;

  while (Date.now() < deadline) {
    sleep(2);
    const pollRes = http.get(pollUrl, pollParams);
    if (pollRes.status !== 200) continue;

    const pollData = pollRes.json();
    const status = pollData?.data?.generation?.status || pollData?.generation?.status;

    if (status === "PROCESSING" && !firstProcessingAt) {
      firstProcessingAt = Date.now();
      queueWaitTrend.add(firstProcessingAt - startTime);
    }

    if (status === "SUCCEEDED") {
      const totalDuration = Date.now() - startTime;
      totalDurationTrend.add(totalDuration);
      generationSuccessRate.add(true);
      return;
    }

    if (status === "FAILED" || status === "REJECTED" || status === "CANCELLED") {
      generationSuccessRate.add(false);
      console.warn(`Генерация ${generationId} завершилась со статусом ${status}`);
      return;
    }
  }

  // Если превышен таймаут
  generationSuccessRate.add(false);
  console.error(`Генерация ${generationId} превысила лимит времени (15 минут)`);
}
