import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adjustCreditBalance } from "@/features/credits/service";
import { adminApiError, adminMutationLimit } from "@/features/admin/http";
import { creditAdjustmentSchema } from "@/features/admin/schemas";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request.headers);
  try {
    await adminMutationLimit(request);
    const { profile: actor } = await requireAdmin(request);
    const userId = z.uuid().parse((await context.params).id);
    const input = creditAdjustmentSchema.parse(await request.json());
    const balance = await getDb().$transaction((tx) => adjustCreditBalance(tx, { userId, actorId: actor.id, ...input }));
    return apiSuccess({ userId, balance }, requestId);
  } catch (error) { return adminApiError(error, requestId, "Не удалось скорректировать баланс"); }
}
