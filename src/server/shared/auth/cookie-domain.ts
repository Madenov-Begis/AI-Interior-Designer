export function isLocalHttpOrigin(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

export function isLocalOAuthCallback(
  appUrl: string,
  callbackUrl: string | undefined,
) {
  if (!isLocalHttpOrigin(appUrl) || !callbackUrl) return false;
  try {
    const callback = new URL(callbackUrl);
    return (
      callback.origin === new URL(appUrl).origin &&
      callback.pathname === "/auth/callback" &&
      !callback.search &&
      !callback.hash
    );
  } catch {
    return false;
  }
}

export function authCookieSecure(
  nodeEnv: string | undefined,
  appUrl: string | undefined,
) {
  return nodeEnv === "production" && !isLocalHttpOrigin(appUrl);
}

export function authCookieDomain(
  nodeEnv: string | undefined,
  configuredDomain: string | undefined,
  appUrl?: string,
) {
  return authCookieSecure(nodeEnv, appUrl) ? configuredDomain : undefined;
}
