import { type NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";

export function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  return apiSuccess({ status: "ok" as const }, requestId);
}
