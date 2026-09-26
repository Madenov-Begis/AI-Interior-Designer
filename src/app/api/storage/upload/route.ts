import { storageHttpRequest } from "@/server/features/media/storage-http-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const PUT = (request: Request) => storageHttpRequest(request, "write");
export const OPTIONS = PUT;
