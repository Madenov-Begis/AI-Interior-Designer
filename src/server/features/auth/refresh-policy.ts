export function isRetryableAuthFailure(error: { status?: number }) {
  return !error.status || error.status >= 500 || error.status === 429;
}
