const API_VERSION_PATH = "/api/v1";
const DEFAULT_API_ORIGIN = "https://api.ruvie.cc";

export function resolveApiBaseUrl(configuredOrigin: string | undefined) {
  const origin = configuredOrigin?.trim().replace(/\/$/, "") || DEFAULT_API_ORIGIN;
  return `${origin}${API_VERSION_PATH}`;
}

export const API_BASE_URL = resolveApiBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL,
);

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
