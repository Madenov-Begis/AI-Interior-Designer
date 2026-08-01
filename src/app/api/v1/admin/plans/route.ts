import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { adminApiError, adminMutationLimit } from "@/features/admin/http";
import { planSchema } from "@/features/admin/schemas";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin();
    return apiSuccess(
      await getDb().plan.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { users: true } } },
      }),
      requestId,
    );
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось загрузить тарифы");
  }
}
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    await adminMutationLimit(request);
    await requireAdmin();
    const input = planSchema.parse(await request.json());
    const plan = await getDb().plan.create({ data: input });
    return apiSuccess(plan, requestId, { status: 201 });
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось создать тариф");
  }
}
