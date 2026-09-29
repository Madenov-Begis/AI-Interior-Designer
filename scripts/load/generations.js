import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import exec from "k6/execution";

const fixture = JSON.parse(open(__ENV.LOAD_FIXTURE || "/fixtures/users.json"));
const image = open(__ENV.LOAD_IMAGE || "/fixtures/large.jpg", "b");
const base = __ENV.LOAD_BASE_URL || "http://web:3000";
const users = Number(__ENV.LOAD_USERS || 20);
const total = new Trend("generation_total_ms", true);
const accepted = new Rate("generation_accepted");
const finished = new Rate("generation_finished");
const succeeded = new Rate("generation_succeeded");
export const options = {
  scenarios: {
    load:
      __ENV.LOAD_STEADY === "true"
        ? {
            executor: "constant-vus",
            vus: users,
            duration: "15m",
            gracefulStop: "16m",
          }
        : {
            executor: "per-vu-iterations",
            vus: users,
            iterations: 1,
            maxDuration: "16m",
          },
  },
  thresholds: {
    checks: ["rate==1"],
    generation_accepted: ["rate==1"],
    generation_finished: ["rate==1"],
    ...(__ENV.EXPECT_FAILURE === "true"
      ? {}
      : { generation_succeeded: ["rate==1"] }),
  },
};
let accessToken;
let refreshToken;
let tokenTime = 0;
function headers(user) {
  accessToken ||= user.token;
  refreshToken ||= user.refreshToken;
  tokenTime ||= user.createdAt;
  if (Date.now() - tokenTime > 10 * 60 * 1000) {
    const res = http.post(`${base}/api/v1/auth/refresh`, null, {
      headers: {
        Origin: __ENV.LOAD_ORIGIN || "http://localhost:3101",
        Cookie: `ruvie_refresh_token=${refreshToken}`,
      },
    });
    if (res.status === 200) {
      accessToken = res.json("data.accessToken");
      tokenTime = Date.now();
      refreshToken =
        res.cookies.ruvie_refresh_token?.[0]?.value || refreshToken;
    }
  }
  return { Authorization: `Bearer ${accessToken}`, "Accept-Language": "ru" };
}
export default function runUser() {
  const user = fixture.users[exec.vu.idInTest - 1];
  if (!user) throw new Error("Недостаточно тестовых пользователей");
  let projectId = user.projectId;
  if (__ENV.LOAD_UPLOADS === "true") {
    const project = http.post(
      `${base}/api/v1/projects`,
      JSON.stringify({ name: "Тест загрузки" }),
      { headers: { ...headers(user), "Content-Type": "application/json" } },
    );
    if (!check(project, { "проект создан": (r) => r.status === 201 })) return;
    projectId = project.json("data.id");
    let uploaded;
    for (let attempt = 0; attempt < 30; attempt++) {
      uploaded = http.post(
        `${base}/api/v1/projects/${projectId}/source`,
        { file: http.file(image, "large.jpg", "image/jpeg") },
        { headers: headers(user), timeout: "180s" },
      );
      if (uploaded.status !== 503) break;
      sleep(3);
    }
    if (!check(uploaded, { "фото загружено": (r) => r.status === 201 })) return;
  }
  const start = Date.now();
  const res = http.post(
    `${base}/api/v1/projects/${projectId}/generations`,
    JSON.stringify({
      fields: {
        prompt: ["Светлая комната"],
        roomTypeId: [fixture.roomTypeId],
        aspectRatio: ["RATIO_1_1"],
        visualPromptAction: ["clear"],
      },
      uploads: [],
    }),
    {
      headers: {
        ...headers(user),
        "Content-Type": "application/json",
        "Idempotency-Key": `load-${user.userId}-${exec.vu.iterationInScenario}-${start}`,
      },
      timeout: "60s",
    },
  );
  accepted.add(res.status === 202);
  if (res.status !== 202) return;
  const id = res.json("data.generation.id");
  while (Date.now() - start < 930_000) {
    const response = http.get(`${base}/api/v1/generations/${id}`, {
      headers: headers(user),
    });
    if (response.status === 200) {
      const status = response.json("data.generation.status");
      if (["SUCCEEDED", "FAILED", "CANCELLED", "REJECTED"].includes(status)) {
        total.add(Date.now() - start);
        finished.add(true);
        succeeded.add(status === "SUCCEEDED");
        return;
      }
    }
    sleep(2);
  }
  finished.add(false);
}
export function handleSummary(data) {
  return {
    "/fixtures/summary.json": JSON.stringify(data, null, 2),
    stdout: JSON.stringify({ metrics: data.metrics }, null, 2),
  };
}
