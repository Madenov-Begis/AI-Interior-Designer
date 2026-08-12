export function exactOrigins(
  configured: string | undefined,
  developmentDefaults: string[] = [],
  nodeEnv: string | undefined = process.env.NODE_ENV,
) {
  const origins = (configured ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (nodeEnv !== "production") origins.push(...developmentDefaults);
  return new Set(origins);
}
