import assert from "node:assert/strict";
import test from "node:test";
import {
  getVercelOidcTokenOptions,
  hasCompleteVercelWorkloadIdentityConfig,
  parseVercelWorkloadIdentityConfig,
} from "./workload-identity.ts";

const completeConfig = {
  GCP_PROJECT_NUMBER: "123456789012",
  GCP_SERVICE_ACCOUNT_EMAIL: "ruvie-vertex@example.iam.gserviceaccount.com",
  GCP_WORKLOAD_IDENTITY_POOL_ID: "vercel-ruvie",
  GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "vercel",
  GCP_WORKLOAD_IDENTITY_TOKEN_AUDIENCE: "https://vercel.com/ruvie-team",
};

test("Workload Identity не включается без federation-переменных", () => {
  assert.equal(parseVercelWorkloadIdentityConfig({}), null);
});

test("Workload Identity принимает только полный набор federation-переменных", () => {
  assert.equal(hasCompleteVercelWorkloadIdentityConfig(completeConfig), true);
  assert.deepEqual(
    parseVercelWorkloadIdentityConfig(completeConfig),
    completeConfig,
  );
});

test("Workload Identity запрашивает Vercel token с настроенной audience", () => {
  const config = parseVercelWorkloadIdentityConfig(completeConfig);
  assert.deepEqual(getVercelOidcTokenOptions(config!), {
    audience: "https://vercel.com/ruvie-team",
  });
});

test("Workload Identity отклоняет частичную конфигурацию", () => {
  assert.equal(
    hasCompleteVercelWorkloadIdentityConfig({
      GCP_PROJECT_NUMBER: completeConfig.GCP_PROJECT_NUMBER,
    }),
    false,
  );
  assert.throws(
    () =>
      parseVercelWorkloadIdentityConfig({
        GCP_PROJECT_NUMBER: completeConfig.GCP_PROJECT_NUMBER,
      }),
    /VERTEX_WORKLOAD_IDENTITY_INCOMPLETE/,
  );
});
