import { exactOrigins } from "../../shared/security/cors.ts";

export function getAdminOrigins(
  nodeEnv: string | undefined,
  configured: string | undefined,
) {
  return exactOrigins(
    configured,
    ["http://localhost:5173", "http://127.0.0.1:5173"],
    nodeEnv,
  );
}

export function isAdminOriginAllowed(
  origin: string,
  nodeEnv: string | undefined,
  configured: string | undefined,
) {
  return getAdminOrigins(nodeEnv, configured).has(origin);
}
