const DEFAULT_APP_NAME = "Ruvie";

export function resolveAppName(value: string | undefined): string {
  return value?.trim() || DEFAULT_APP_NAME;
}

export const APP_NAME = resolveAppName(process.env.NEXT_PUBLIC_APP_NAME);
