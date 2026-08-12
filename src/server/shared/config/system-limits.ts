import "server-only";

import { serverEnv } from "./env";

export type SystemLimits = {
  maxParallelGenerations: number;
  maxReferenceImages: number;
  maxReferenceUrls: number;
  maxUploadSizeMb: number;
  maxUploadSizeBytes: number;
  maxOutputWidth: number;
  maxOutputHeight: number;
};

export function getSystemLimits(): SystemLimits {
  const env = serverEnv();
  return {
    maxParallelGenerations: env.MAX_PARALLEL_GENERATIONS,
    maxReferenceImages: env.MAX_REFERENCE_IMAGES,
    maxReferenceUrls: env.MAX_REFERENCE_URLS,
    maxUploadSizeMb: env.MAX_UPLOAD_SIZE_MB,
    maxUploadSizeBytes: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    maxOutputWidth: env.MAX_OUTPUT_WIDTH,
    maxOutputHeight: env.MAX_OUTPUT_HEIGHT,
  };
}
