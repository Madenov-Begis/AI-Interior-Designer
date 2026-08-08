import type { AxiosRequestConfig } from "axios";
import type {
  WorkspaceGeneration,
  WorkspaceGenerationList,
} from "../model/workspace-types";
import { ApiResponseError } from "@/features/generate-design";
import { ApiClientError, apiData } from "@/shared/api";

export type GenerationClientPayload = {
  generation: WorkspaceGeneration;
};

async function requestWorkspaceData<T>(config: AxiosRequestConfig) {
  try {
    return await apiData<T>(config);
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw new ApiResponseError(error.code, error.message, error.status);
    }
    throw error;
  }
}

export function readProjectGenerations(projectId: string) {
  return requestWorkspaceData<WorkspaceGenerationList>({
    url: "/generations",
    method: "GET",
    params: { projectId, limit: 20 },
  });
}

export function readGeneration(generationId: string) {
  return requestWorkspaceData<GenerationClientPayload>({
    url: `/generations/${generationId}`,
    method: "GET",
  });
}

export function createProjectGeneration(
  projectId: string,
  body: FormData,
  idempotencyKey: string,
) {
  return requestWorkspaceData<GenerationClientPayload>({
    url: `/projects/${projectId}/generations`,
    method: "POST",
    headers: { "idempotency-key": idempotencyKey },
    data: body,
  });
}

export function cancelProjectGeneration(generationId: string) {
  return requestWorkspaceData<GenerationClientPayload>({
    url: `/generations/${generationId}/cancel`,
    method: "POST",
  });
}

export function retryProjectGeneration(
  generationId: string,
  idempotencyKey: string,
) {
  return requestWorkspaceData<GenerationClientPayload>({
    url: `/generations/${generationId}/retry`,
    method: "POST",
    headers: { "idempotency-key": idempotencyKey },
  });
}

export function refineProjectGeneration(
  generationId: string,
  body: FormData,
  idempotencyKey: string,
) {
  return requestWorkspaceData<GenerationClientPayload>({
    url: `/generations/${generationId}/refinements`,
    method: "POST",
    headers: { "idempotency-key": idempotencyKey },
    data: body,
  });
}
