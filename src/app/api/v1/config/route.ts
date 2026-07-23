import type { NextRequest } from "next/server";
import { INTERIOR_STYLES } from "@/features/generations/interior-styles";
import { apiSuccess } from "@/lib/api/contracts";
import { getRequestId } from "@/lib/api/request-id";

export async function GET(request: NextRequest) { return apiSuccess({ appName: "AI Interior Designer", timezone: process.env.APP_TIMEZONE ?? "Asia/Tashkent", maxSourceImageMb: 15, supportedSourceTypes: ["image/jpeg", "image/png", "image/webp"], visualPrompt: true, urlReferences: true, aiMode: (process.env.AI_PROVIDER ?? "fake") === "fake" ? "mock" : "live", interiorStyles: INTERIOR_STYLES.map(({ code, name, imageUrl }) => ({ code, name, imageUrl })) }, getRequestId(request.headers)); }
