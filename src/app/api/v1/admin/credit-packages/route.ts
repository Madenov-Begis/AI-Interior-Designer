import type { NextRequest } from "next/server";
import {
  adminApiError,
  adminMutationLimit,
  parseAdminJson,
} from "@/server/features/admin/http";
import { createCreditPackageSchema } from "@/server/features/admin/schemas";
import {
  createAdminCreditPackage,
  listAdminCreditPackages,
} from "@/server/features/admin/service";
import { requireAdmin } from "@/server/features/auth/admin";
import { apiSuccess } from "@/server/shared/api/responses";
import { getRequestId } from "@/server/shared/api/request-id";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin(request);
    return apiSuccess(await listAdminCreditPackages(), requestId);
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось загрузить пакеты");
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  try {
    await adminMutationLimit(request);
    await requireAdmin(request);
    const input = createCreditPackageSchema.parse(await parseAdminJson(request));
    return apiSuccess(await createAdminCreditPackage(input), requestId, {
      status: 201,
    });
  } catch (error) {
    return adminApiError(error, requestId, "Не удалось создать пакет");
  }
}
