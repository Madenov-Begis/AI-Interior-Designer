import "server-only";

import type { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

function requestMetadata(request: NextRequest) {
  return {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
  };
}

export function writeAuditLog(input: {
  request: NextRequest;
  actorId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return getDb().auditLog.create({ data: { actorId: input.actorId, action: input.action, entityType: input.entityType, entityId: input.entityId, metadata: input.metadata, ...requestMetadata(input.request) } });
}
