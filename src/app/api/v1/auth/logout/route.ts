import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) { const requestId = getRequestId(request.headers); const supabase = await createSupabaseServerClient(); const { error } = await supabase.auth.signOut(); return error ? apiError("LOGOUT_FAILED", "Не удалось завершить сессию", requestId, 500) : apiSuccess({ signedOut: true }, requestId); }
