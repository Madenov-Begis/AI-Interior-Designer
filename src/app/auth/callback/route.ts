import { type NextRequest } from "next/server";
import { nativeGoogleCallback } from "@/server/features/auth/native-callback";

export async function GET(request: NextRequest) {
  return nativeGoogleCallback(request);
}
