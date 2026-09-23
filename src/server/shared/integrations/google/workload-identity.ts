import { ExternalAccountClient } from "google-auth-library";

const REQUIRED_FIELDS = [
  "GCP_PROJECT_NUMBER",
  "GCP_SERVICE_ACCOUNT_EMAIL",
  "GCP_WORKLOAD_IDENTITY_POOL_ID",
  "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID",
  "GCP_WORKLOAD_IDENTITY_TOKEN_AUDIENCE",
] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];

export type VercelWorkloadIdentityConfig = Record<RequiredField, string>;

export function parseVercelWorkloadIdentityConfig(
  input: Record<string, string | undefined>,
): VercelWorkloadIdentityConfig | null {
  const values = Object.fromEntries(
    REQUIRED_FIELDS.map((field) => [field, input[field]?.trim()]),
  ) as Record<RequiredField, string | undefined>;
  const configuredFields = REQUIRED_FIELDS.filter((field) => values[field]);

  if (configuredFields.length === 0) return null;
  if (configuredFields.length !== REQUIRED_FIELDS.length) {
    throw new Error("VERTEX_WORKLOAD_IDENTITY_INCOMPLETE");
  }

  return values as VercelWorkloadIdentityConfig;
}

export function createVercelWorkloadIdentityClient(
  config: VercelWorkloadIdentityConfig,
  getSubjectToken: () => Promise<string>,
) {
  const providerPath = `projects/${config.GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${config.GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${config.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`;
  const authClient = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/${providerPath}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${config.GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
    subject_token_supplier: { getSubjectToken },
  });

  if (!authClient) throw new Error("VERTEX_WORKLOAD_IDENTITY_INVALID");
  return authClient;
}

export function getVercelOidcTokenOptions(
  config: VercelWorkloadIdentityConfig,
) {
  return { audience: config.GCP_WORKLOAD_IDENTITY_TOKEN_AUDIENCE };
}
