export function authCookieDomain(
  nodeEnv: string | undefined,
  configuredDomain: string | undefined,
) {
  return nodeEnv === "production" ? configuredDomain : undefined;
}
