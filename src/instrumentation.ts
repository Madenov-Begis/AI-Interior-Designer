export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { serverEnv } = await import("@/server/shared/config/env");
  serverEnv();
}
