import assert from "node:assert/strict";
import test from "node:test";
import { parseVercelWorkloadIdentityConfig } from "./workload-identity.ts";

const completeConfig = {
  GCP_PROJECT_NUMBER: "123456789012",
  GCP_SERVICE_ACCOUNT_EMAIL: "ruvie-vertex@example.iam.gserviceaccount.com",
  GCP_WORKLOAD_IDENTITY_POOL_ID: "vercel-ruvie",
  GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "vercel",
};

test("Workload Identity не включается без federation-переменных", () => {
  assert.equal(parseVercelWorkloadIdentityConfig({}), null);
});

test("Workload Identity принимает только полный набор federation-переменных", () => {
  assert.deepEqual(
    parseVercelWorkloadIdentityConfig(completeConfig),
    completeConfig,
  );
});

test("Workload Identity отклоняет частичную конфигурацию", () => {
  assert.throws(
    () =>
      parseVercelWorkloadIdentityConfig({
        GCP_PROJECT_NUMBER: completeConfig.GCP_PROJECT_NUMBER,
      }),
    /VERTEX_WORKLOAD_IDENTITY_INCOMPLETE/,
  );
});
