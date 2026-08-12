export function getLocalAdminPhone(
  authorization: string | null,
  nodeEnv: string | undefined,
) {
  const phone = authorization?.match(/^AdminPhone\s+(\+998\d{9})$/)?.[1] ?? null;
  if (phone && nodeEnv === "production") return { phone: null, disabled: true };
  return { phone, disabled: false };
}
