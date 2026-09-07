import dotenv from "dotenv";
import { GoogleAuth } from "google-auth-library";

dotenv.config({ path: ".env.local" });

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const rawCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
if (!projectId || !rawCredentials) {
  throw new Error(
    "GOOGLE_CLOUD_PROJECT_ID и GOOGLE_APPLICATION_CREDENTIALS_JSON обязательны",
  );
}

const credentials = JSON.parse(rawCredentials);
const auth = new GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
const client = await auth.getClient();
const requestHeaders = Object.fromEntries(
  (await client.getRequestHeaders()).entries(),
);

async function request(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...requestHeaders,
      "content-type": "application/json",
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

const billing = await request(
  `https://cloudbilling.googleapis.com/v1/projects/${projectId}/billingInfo`,
);
const iam = await request(
  `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:testIamPermissions`,
  {
    method: "POST",
    body: JSON.stringify({
      permissions: [
        "aiplatform.endpoints.predict",
        "billing.resourceCosts.get",
        "resourcemanager.projects.getIamPolicy",
        "serviceusage.quotas.get",
        "serviceusage.quotas.update",
      ],
    }),
  },
);

let budgets;
if (billing.body.billingAccountName) {
  budgets = await request(
    `https://billingbudgets.googleapis.com/v1/${billing.body.billingAccountName}/budgets?pageSize=100`,
  );
}

const result = {
  projectId,
  serviceAccount: credentials.client_email,
  billing: {
    reachable: billing.status === 200,
    enabled: billing.body.billingEnabled ?? null,
    error: billing.body.error?.message ?? null,
  },
  iam: {
    reachable: iam.status === 200,
    grantedPermissions: iam.body.permissions ?? [],
    error: iam.body.error?.message ?? null,
  },
  budgets: budgets
    ? {
        reachable: budgets.status === 200,
        names: (budgets.body.budgets ?? []).map((budget) => budget.displayName),
        error: budgets.body.error?.message ?? null,
      }
    : null,
};

console.log(JSON.stringify(result, null, 2));
if (
  !result.billing.reachable ||
  !result.iam.reachable ||
  !result.budgets?.reachable
) {
  process.exitCode = 1;
}
