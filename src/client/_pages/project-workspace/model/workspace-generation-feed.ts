"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type GenerationClientPayload,
  readGeneration,
  readProjectGenerations,
} from "../api/workspace-generations";
import { mergeGenerationIntoList } from "./generation-cache";
import type {
  WorkspaceGenerationList,
  WorkspaceGenerationStatus,
} from "./workspace-types";
import {
  ApiResponseError,
  type CreditsLifecycleEvent,
  pruneTrackedGenerationIds,
  reconcileTerminalCredits,
  refreshCreditsAfterLifecycle,
} from "@/features/generate-design";

function isActiveGeneration(status: WorkspaceGenerationStatus) {
  return status === "QUEUED" || status === "PROCESSING";
}

export function useWorkspaceGenerationFeed(
  projectId: string,
  initialGenerations: WorkspaceGenerationList,
) {
  const queryClient = useQueryClient();
  const observedTerminalIdsRef = useRef(
    new Set(
      initialGenerations.items
        .filter((generation) => !isActiveGeneration(generation.status))
        .map((generation) => generation.id),
    ),
  );
  const [trackedGenerationIds, setTrackedGenerationIds] = useState<string[]>(
    [],
  );
  const queryKey = useMemo(
    () => ["generations", projectId] as const,
    [projectId],
  );
  const generationsQuery = useQuery({
    queryKey,
    queryFn: () => readProjectGenerations(projectId),
    initialData: initialGenerations,
  });

  const invalidateCredits = useCallback(
    (event: CreditsLifecycleEvent) =>
      refreshCreditsAfterLifecycle(queryClient, event),
    [queryClient],
  );

  const reconcileInsufficientCredits = useCallback(
    (error: Error) => {
      if (
        error instanceof ApiResponseError &&
        error.code === "INSUFFICIENT_CREDITS"
      ) {
        void invalidateCredits("insufficient-error");
      }
    },
    [invalidateCredits],
  );

  const applyGenerationPayload = useCallback(
    ({ generation }: GenerationClientPayload) => {
      queryClient.setQueryData<WorkspaceGenerationList>(queryKey, (current) =>
        mergeGenerationIntoList(current, generation),
      );
      if (isActiveGeneration(generation.status)) {
        setTrackedGenerationIds((current) =>
          current.includes(generation.id)
            ? current
            : [...current, generation.id],
        );
        return;
      }
      observedTerminalIdsRef.current.add(generation.id);
      setTrackedGenerationIds((current) =>
        current.filter((generationId) => generationId !== generation.id),
      );
    },
    [queryClient, queryKey],
  );

  useEffect(() => {
    const reconciliation = reconcileTerminalCredits(
      observedTerminalIdsRef.current,
      generationsQuery.data.items,
    );
    observedTerminalIdsRef.current = reconciliation.observedTerminalIds;
    if (reconciliation.queryKey) {
      void invalidateCredits("terminal");
    }
  }, [generationsQuery.data.items, invalidateCredits]);

  const activeGenerationIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...trackedGenerationIds,
          ...generationsQuery.data.items
            .filter((generation) => isActiveGeneration(generation.status))
            .map((generation) => generation.id),
        ]),
      ),
    [generationsQuery.data.items, trackedGenerationIds],
  );
  const pollingPayloads = useQueries({
    queries: activeGenerationIds.map((generationId) => ({
      queryKey: ["generation", generationId],
      queryFn: () => readGeneration(generationId),
      refetchInterval: (query: {
        state: { data?: GenerationClientPayload };
      }) =>
        query.state.data &&
        !isActiveGeneration(query.state.data.generation.status)
          ? false
          : 2000,
    })),
    combine: (queries) =>
      queries.flatMap((query) => (query.data ? [query.data] : [])),
  });

  useEffect(() => {
    if (pollingPayloads.length > 0) {
      queryClient.setQueryData<WorkspaceGenerationList>(queryKey, (current) =>
        pollingPayloads.reduce(
          (next, { generation }) => mergeGenerationIntoList(next, generation),
          current,
        ),
      );
    }

    const unseen = pollingPayloads.filter(
      ({ generation }) =>
        !isActiveGeneration(generation.status) &&
        !observedTerminalIdsRef.current.has(generation.id),
    );
    if (unseen.length === 0) return;

    unseen.forEach(({ generation }) =>
      observedTerminalIdsRef.current.add(generation.id),
    );
    setTrackedGenerationIds((current) =>
      pruneTrackedGenerationIds(
        current,
        unseen.map(({ generation }) => generation.id),
      ),
    );
    void invalidateCredits("terminal");
  }, [invalidateCredits, pollingPayloads, queryClient, queryKey]);

  return {
    generationsQuery,
    applyGenerationPayload,
    invalidateCredits,
    reconcileInsufficientCredits,
  };
}
