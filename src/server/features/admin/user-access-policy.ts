export type AdminAccessViolation = "SELF_LOCKOUT" | "LAST_ADMIN" | null;

export function removesActiveAdminAccess(input: {
  currentRole: "USER" | "ADMIN";
  currentStatus: "ACTIVE" | "BLOCKED" | "DELETED";
  nextRole?: "USER" | "ADMIN";
  nextStatus?: "ACTIVE" | "BLOCKED" | "DELETED";
}) {
  return (
    input.currentRole === "ADMIN" &&
    input.currentStatus === "ACTIVE" &&
    (input.nextRole === "USER" ||
      input.nextStatus === "BLOCKED" ||
      input.nextStatus === "DELETED")
  );
}

export function adminAccessViolation(input: {
  actorId: string;
  targetId: string;
  removesAccess: boolean;
  otherActiveAdmins: number;
}): AdminAccessViolation {
  if (!input.removesAccess) return null;
  if (input.actorId === input.targetId) return "SELF_LOCKOUT";
  if (input.otherActiveAdmins === 0) return "LAST_ADMIN";
  return null;
}
