"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useState, type RefObject } from "react";
import {
  cancelProjectGeneration,
  createProjectGeneration,
  refineProjectGeneration,
  retryProjectGeneration,
  type GenerationClientPayload,
} from "../api/workspace-generations";
import {
  RefinementAttemptRegistry,
  refinementAttemptSignature,
} from "./refinement-attempt";
import type { GenerationAspectRatio } from "./generation-aspect-ratio";
import type { WorkspaceGeneration } from "./workspace-types";
import {
  type CreditsLifecycleEvent,
  type RetryGenerationAttempt,
  RetryAttemptRegistry,
} from "@/features/generate-design";
import type { VisualPromptEditorHandle } from "@/features/visual-prompt";
import { useAppSession } from "@/features/auth/index.client";
import { RootAttemptRegistry, rootAttemptSignature } from "./root-attempt";

type WorkspaceGenerationActionsOptions = {
  projectId: string;
  prompt: string;
  aspectRatio: GenerationAspectRatio;
  styleCode: string | undefined;
  visualPromptRef: RefObject<VisualPromptEditorHandle | null>;
  refinementPromptRef: RefObject<VisualPromptEditorHandle | null>;
  applyGenerationPayload(payload: GenerationClientPayload): void;
  invalidateCredits(event: CreditsLifecycleEvent): Promise<unknown>;
  reconcileInsufficientCredits(error: Error): void;
  focusGeneration(generationId: string): void;
};

type RefinementSubmitInput = {
  prompt: string;
  files: File[];
};

type RefinementMutationInput = RefinementSubmitInput & {
  generationId: string;
  visualPrompt: Awaited<ReturnType<VisualPromptEditorHandle["snapshot"]>>;
  signature: string;
  idempotencyKey: string;
};

export function useWorkspaceGenerationActions({
  projectId,
  prompt,
  aspectRatio,
  styleCode,
  visualPromptRef,
  refinementPromptRef,
  applyGenerationPayload,
  invalidateCredits,
  reconcileInsufficientCredits,
  focusGeneration,
}: WorkspaceGenerationActionsOptions) {
  const { user } = useAppSession();
  const [rootAttempts] = useState(() => {
    try {
      return new RootAttemptRegistry(window.sessionStorage);
    } catch {
      return new RootAttemptRegistry();
    }
  });
  const [retryAttempts] = useState(() => new RetryAttemptRegistry());
  const [refinementAttempts] = useState(() => new RefinementAttemptRegistry());

  const reserveCurrentGeneration = useCallback(
    async (idempotencyKey?: string) => {
      if (prompt.trim().length < 3) {
        throw new Error("Опишите изменения не менее чем в трёх символах");
      }
      if (!visualPromptRef.current) {
        throw new Error("Редактор разметки ещё не готов");
      }

      const visualPrompt = await visualPromptRef.current.snapshot();
      const body = new FormData();
      body.set("prompt", prompt);
      body.set("aspectRatio", aspectRatio);
      if (styleCode) body.set("styleCode", styleCode);
      if (visualPrompt) {
        body.set("visualPromptAction", "replace");
        body.set("overlay", visualPrompt.overlay, "visual-prompt.png");
        body.set("canvasState", JSON.stringify(visualPrompt.state));
      } else {
        body.set("visualPromptAction", "clear");
      }

      const attempt = idempotencyKey
        ? null
        : rootAttempts.begin(
            `${user.id}:${projectId}`,
            await rootAttemptSignature({
              projectId,
              prompt,
              aspectRatio,
              styleCode,
              canvasState: visualPrompt?.state ?? null,
            }),
          );
      const result = await createProjectGeneration(
        projectId,
        body,
        idempotencyKey ?? attempt!.idempotencyKey,
      );
      if (attempt) rootAttempts.succeed(attempt);
      // Generation success confirms its own snapshot, not the editor's autosave.
      // Keep the draft until its separate PUT/DELETE has been acknowledged.
      return result;
    },
    [
      aspectRatio,
      projectId,
      prompt,
      styleCode,
      visualPromptRef,
      rootAttempts,
      user.id,
    ],
  );

  const created = useCallback(
    (data: GenerationClientPayload) => {
      applyGenerationPayload(data);
      focusGeneration(data.generation.id);
      void invalidateCredits("reservation");
    },
    [applyGenerationPayload, focusGeneration, invalidateCredits],
  );

  const createGeneration = useMutation({
    mutationFn: () => reserveCurrentGeneration(),
    onSuccess: created,
    onError: reconcileInsufficientCredits,
  });
  const cancelGeneration = useMutation({
    mutationFn: cancelProjectGeneration,
    onSuccess: (data) => {
      applyGenerationPayload(data);
      void invalidateCredits("cancellation-refund");
    },
  });
  const retryGeneration = useMutation({
    mutationFn: async (
      attempt: RetryGenerationAttempt<WorkspaceGeneration>,
    ) => {
      const generation = attempt.generation;
      if (generation.status === "REJECTED") {
        return reserveCurrentGeneration(attempt.idempotencyKey);
      }
      if (!visualPromptRef.current) {
        throw new Error("Редактор разметки ещё не готов");
      }

      await visualPromptRef.current.persist();
      return retryProjectGeneration(generation.id, attempt.idempotencyKey);
    },
    onSuccess: (data, attempt) => {
      retryAttempts.recordSuccess(attempt.generation.id);
      created(data);
    },
    onError: (error, attempt) => {
      retryAttempts.recordFailure(attempt.generation.id, error);
      reconcileInsufficientCredits(error);
    },
  });
  const createRefinement = useMutation({
    mutationFn: async (input: RefinementMutationInput) => {
      const body = new FormData();
      body.set("prompt", input.prompt);
      input.files.forEach((file) => body.append("files", file));
      if (input.visualPrompt) {
        body.set("overlay", input.visualPrompt.overlay, "visual-prompt.png");
        body.set("canvasState", JSON.stringify(input.visualPrompt.state));
      }
      return refineProjectGeneration(
        input.generationId,
        body,
        input.idempotencyKey,
      );
    },
    onSuccess: (data, input) => {
      refinementAttempts.recordSuccess(input.signature);
      created(data);
    },
    onError: (error, input) => {
      refinementAttempts.recordFailure(input.signature, error);
      reconcileInsufficientCredits(error);
    },
  });

  const submitRefinement = useCallback(
    async (generationId: string, input: RefinementSubmitInput) => {
      const visualPrompt =
        (await refinementPromptRef.current?.snapshot()) ?? null;
      const signature = refinementAttemptSignature({
        generationId,
        prompt: input.prompt,
        files: input.files,
        canvasState: visualPrompt?.state ?? null,
      });
      const attempt = refinementAttempts.begin(signature);
      await createRefinement.mutateAsync({
        generationId,
        ...input,
        visualPrompt,
        signature,
        idempotencyKey: attempt.idempotencyKey,
      });
    },
    [createRefinement, refinementAttempts, refinementPromptRef],
  );

  return {
    createGeneration,
    cancelGeneration,
    retryGeneration,
    createRefinement,
    submitRefinement,
    retryAttempts,
  };
}
