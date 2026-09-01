const DEFAULT_TIMEOUT_MS = 10_000;

function timeoutSignal(timeoutMs = DEFAULT_TIMEOUT_MS) {
  return AbortSignal.timeout(timeoutMs);
}

async function request(url, expectedStatus, options = {}) {
  const response = await fetch(url, {
    redirect: "manual",
    signal: timeoutSignal(),
    ...options,
  });
  if (response.status !== expectedStatus) {
    throw new Error(
      `${url} returned ${response.status}, expected ${expectedStatus}`,
    );
  }
  return response;
}

const checks = [
  async () => request("https://ruvie.cc/", 200),
  async () => {
    const response = await request("https://www.ruvie.cc/", 308);
    if (response.headers.get("location") !== "https://ruvie.cc/") {
      throw new Error("www.ruvie.cc returned an unexpected redirect target");
    }
  },
  async () => request("https://ruvie.cc/login", 200),
  async () => request("https://admin.ruvie.cc/", 200),
  async () => request("https://api.ruvie.cc/api/v1/auth/me", 401),
  async () => request("https://api.ruvie.cc/api/v1/admin/session", 401),
  async () => {
    const response = await request(
      "https://api.ruvie.cc/api/v1/credits/packages",
      200,
    );
    const body = await response.json();
    if (body?.data?.paymentMode !== "disabled") {
      throw new Error("Production payment mode is not disabled");
    }
    if (!Array.isArray(body?.data?.items) || body.data.items.length === 0) {
      throw new Error("Production credit package list is empty or malformed");
    }
  },
];

const results = await Promise.allSettled(checks.map((check) => check()));
const failures = results.filter((result) => result.status === "rejected");

if (failures.length > 0) {
  for (const failure of failures)
    console.error(failure.reason?.message ?? failure.reason);
  process.exitCode = 1;
} else {
  console.log(`Production smoke passed (${checks.length} checks)`);
}
