import { storageHttpRequest } from "@/server/features/media/storage-http-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => storageHttpRequest(request, "read");
export const HEAD = GET;
export const OPTIONS = GET;
