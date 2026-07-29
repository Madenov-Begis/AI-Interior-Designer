"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Settings2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasViewport } from "@/components/design/canvas-viewport";
import { DesignInspector } from "@/components/design/design-inspector";
import { EmptySourceWorkspace } from "@/components/design/empty-source-workspace";
import { GenerationCanvasCard } from "@/components/design/generation-canvas-card";
import { GenerationContextOverlay } from "@/components/design/generation-context-overlay";
import { GenerationRefinementComposer } from "@/components/design/generation-refinement-composer";
import { ResultActions } from "@/components/design/result-actions";
import { SourceReplaceControl } from "@/components/design/source-replace-control";
import { WorkspaceHeader } from "@/components/design/workspace-header";
import { WorkspaceToolbar } from "@/components/design/workspace-toolbar";
import type { DesignWorkspaceProps, WorkspaceGeneration, WorkspaceGenerationStatus } from "@/components/design/workspace-types";
import { nextRefinementOverlayState } from "@/features/canvas/refinement-overlay-state";
import {
  creditQueryOptions,
  loadCredits,
} from "@/features/credits/client";
import {
  ApiResponseError,
  buildRetryGenerationRequest,
  type CreditsLifecycleEvent,
  type GenerationWallet,
  type RetryGenerationAttempt,
  generationCanvasActionErrorPresentation,
  generationWalletPresentation,
  pruneTrackedGenerationIds,
  readApiData,
  reconcileTerminalCredits,
  refreshCreditsAfterLifecycle,
  RetryAttemptRegistry,
} from "@/features/generations/client-wallet";
import { buildGenerationLabels } from "@/features/generations/tree";
import type { VisualPromptEditorHandle, VisualPromptTool } from "@/features/visual-prompt/types";

type GenerationList = {
  items: WorkspaceGeneration[];
  nextCursor: string | null;
  total: number;
};

type Style = { code: string; name: string; imageUrl: string };

const DEFAULT_PROMPT =
  "Сделай современный ремонт. Используй предметы интерьера из референсов. Не меняй ракурс, пропорции и геометрию помещения.";

function isActiveGeneration(status: WorkspaceGenerationStatus) {
  return status === "QUEUED" || status === "PROCESSING";
}

type ReadyDesignWorkspaceProps = Omit<DesignWorkspaceProps, "project"> & {
  project: DesignWorkspaceProps["project"] & {
    source: NonNullable<DesignWorkspaceProps["project"]["source"]>;
  };
};

export function DesignWorkspace(props: DesignWorkspaceProps) {
  if (!props.project.source) {
    return (
      <EmptySourceWorkspace
        projectId={props.project.id}
        projectName={props.project.name}
      />
    );
  }

  return (
    <ReadyDesignWorkspace
      project={{ ...props.project, source: props.project.source }}
      initialReferences={props.initialReferences}
    />
  );
}

function ReadyDesignWorkspace({
  project,
  initialReferences,
}: ReadyDesignWorkspaceProps) {
  const source = project.source;
  const queryClient = useQueryClient();
  const visualPromptRef = useRef<VisualPromptEditorHandle | null>(null);
  const refinementPromptRef = useRef<VisualPromptEditorHandle | null>(null);
  const observedTerminalIdsRef = useRef(new Set<string>());
  const inspectorDialogRef = useRef<HTMLDialogElement>(null);
  const inspectorTriggerRef = useRef<HTMLButtonElement>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [trackedGenerationIds, setTrackedGenerationIds] = useState<string[]>(
    [],
  );
  const [desktopInspector, setDesktopInspector] = useState(false);
  const [prompt, setPrompt] = useState(project.prompt ?? DEFAULT_PROMPT);
  const [aspectRatio, setAspectRatio] = useState(project.aspectRatio);
  const [styleCode, setStyleCode] = useState<string>();
  const [selectedCanvasItem, setSelectedCanvasItem] = useState<string>("source");
  const [hiddenCanvasItemIds, setHiddenCanvasItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [duplicatedGenerationInstances, setDuplicatedGenerationInstances] =
    useState<Array<{ nodeId: string; generationId: string }>>([]);
  const [refinementEditorNodeId, setRefinementEditorNodeId] = useState<
    string | null
  >(null);
  const [openedResult, setOpenedResult] = useState<{
    generationId: string;
    resultUrl: string;
  } | null>(null);
  const [tool, setTool] = useState<VisualPromptTool>("select");
  const [color, setColor] = useState("#afea4d");
  const [strokeWidth, setStrokeWidth] = useState(12);
  const [canvasActionError, setCanvasActionError] = useState<string | null>(
    null,
  );
  const [retryAttempts] = useState(() => new RetryAttemptRegistry());
  const [{ canUndo, canRedo }, setHistoryState] = useState({
    canUndo: false,
    canRedo: false,
  });

  const generationsQuery = useQuery({
    queryKey: ["generations", project.id],
    queryFn: async () =>
      readApiData<GenerationList>(
        await fetch(`/api/v1/generations?projectId=${project.id}&limit=20`),
      ),
  });
  const configQuery = useQuery({
    queryKey: ["config"],
    queryFn: async () =>
      (
        await readApiData<{ interiorStyles: Style[] }>(
          await fetch("/api/v1/config"),
        )
      ).interiorStyles,
  });
  const creditsQuery = useQuery(
    creditQueryOptions(({ signal }) =>
      loadCredits<GenerationWallet>(signal),
    ),
  );

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

  useEffect(() => {
    if (!generationsQuery.data?.items) return;
    const reconciliation = reconcileTerminalCredits(
      observedTerminalIdsRef.current,
      generationsQuery.data.items,
    );
    observedTerminalIdsRef.current = reconciliation.observedTerminalIds;
    if (reconciliation.queryKey) {
      void invalidateCredits("terminal");
    }
  }, [generationsQuery.data?.items, invalidateCredits]);

  async function reserveCurrentGeneration(
    idempotencyKey = crypto.randomUUID(),
  ) {
    if (prompt.trim().length < 3) {
      throw new Error("Опишите изменения не менее чем в трёх символах");
    }
    if (!visualPromptRef.current) {
      throw new Error("Редактор разметки ещё не готов");
    }

    await visualPromptRef.current.persist();

    return readApiData<{ id: string }>(
      await fetch("/api/v1/generations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          projectId: project.id,
          prompt,
          aspectRatio,
          styleCode,
        }),
      }),
    );
  }

  const createGeneration = useMutation({
    mutationFn: () => reserveCurrentGeneration(),
    onSuccess: async (data: { id: string }) => {
      setTrackedGenerationIds((current) =>
        current.includes(data.id) ? current : [...current, data.id],
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["generations", project.id] }),
        invalidateCredits("reservation"),
      ]);
    },
    onError: reconcileInsufficientCredits,
  });
  const cancelGeneration = useMutation({
    mutationFn: async (generationId: string) =>
      readApiData<{ id: string; status: "CANCELLED" }>(
        await fetch(`/api/v1/generations/${generationId}/cancel`, {
          method: "POST",
        }),
      ),
    onSuccess: async (data: { id: string; status: "CANCELLED" }) => {
      const reconciliation = reconcileTerminalCredits(
        observedTerminalIdsRef.current,
        [data],
      );
      observedTerminalIdsRef.current = reconciliation.observedTerminalIds;
      setTrackedGenerationIds((current) =>
        current.filter((generationId) => generationId !== data.id),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["generations", project.id] }),
        reconciliation.queryKey
          ? invalidateCredits("cancellation-refund")
          : Promise.resolve(),
      ]);
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

      const retryRequest = buildRetryGenerationRequest(attempt);
      return readApiData<{ id: string }>(
        await fetch(retryRequest.url, retryRequest.init),
      );
    },
    onSuccess: async (
      data: { id: string },
      attempt: RetryGenerationAttempt<WorkspaceGeneration>,
    ) => {
      retryAttempts.recordSuccess(attempt.generation.id);
      setTrackedGenerationIds((current) =>
        current.includes(data.id) ? current : [...current, data.id],
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["generations", project.id] }),
        invalidateCredits("reservation"),
      ]);
    },
    onError: (
      error,
      attempt: RetryGenerationAttempt<WorkspaceGeneration>,
    ) => {
      retryAttempts.recordFailure(attempt.generation.id, error);
      reconcileInsufficientCredits(error);
    },
  });
  const activeGenerationIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...trackedGenerationIds,
          ...(generationsQuery.data?.items ?? [])
            .filter((generation) => isActiveGeneration(generation.status))
            .map((generation) => generation.id),
        ]),
      ),
    [generationsQuery.data?.items, trackedGenerationIds],
  );
  const activeGenerationQueries = useQueries({
    queries: activeGenerationIds.map((generationId) => ({
      queryKey: ["generation", generationId],
      queryFn: async () =>
        readApiData<WorkspaceGeneration>(
          await fetch(`/api/v1/generations/${generationId}`),
        ),
      refetchInterval: (query: {
        state: { data?: WorkspaceGeneration };
      }) =>
        query.state.data && !isActiveGeneration(query.state.data.status)
          ? false
          : 1500,
    })),
  });

  useEffect(() => {
    const terminalGenerations: WorkspaceGeneration[] = [];
    for (const query of activeGenerationQueries) {
      const generation = query.data;
      if (generation && !isActiveGeneration(generation.status)) {
        terminalGenerations.push(generation);
      }
    }
    if (terminalGenerations.length === 0) return;

    const reconciliation = reconcileTerminalCredits(
      observedTerminalIdsRef.current,
      terminalGenerations,
    );
    observedTerminalIdsRef.current = reconciliation.observedTerminalIds;
    const reconciliationTask = reconciliation.queryKey
      ? Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["generations", project.id],
          }),
          invalidateCredits("terminal"),
        ])
      : Promise.resolve();
    let superseded = false;
    void reconciliationTask.then(() => {
      if (!superseded) {
        setTrackedGenerationIds((current) =>
          pruneTrackedGenerationIds(
            current,
            terminalGenerations.map((generation) => generation.id),
          ),
        );
      }
    });
    return () => {
      superseded = true;
    };
  }, [activeGenerationQueries, invalidateCredits, project.id, queryClient]);
  const createRefinement = useMutation({
    mutationFn: async (input: {
      generationId: string;
      prompt: string;
      referenceFileIds: string[];
      files: File[];
    }) => {
      let referenceFileIds = input.referenceFileIds;
      if (input.files.length) {
        const uploadBody = new FormData();
        input.files.forEach((file) => uploadBody.append("files", file));
        const uploaded = await readApiData<{
          references: Array<{ fileId: string }>;
        }>(
          await fetch(
            `/api/v1/generations/${input.generationId}/refinement-references`,
            { method: "POST", body: uploadBody },
          ),
        );
        referenceFileIds = [
          ...referenceFileIds,
          ...uploaded.references.map((item: { fileId: string }) => item.fileId),
        ];
      }

      const body = new FormData();
      body.set("prompt", input.prompt);
      body.set("referenceFileIds", JSON.stringify(referenceFileIds));
      const visualPrompt = await refinementPromptRef.current?.snapshot();
      if (visualPrompt) {
        body.set("overlay", visualPrompt.overlay, "visual-prompt.png");
        body.set("canvasState", JSON.stringify(visualPrompt.state));
      }
      return readApiData<{ id: string }>(
        await fetch(`/api/v1/generations/${input.generationId}/refinements`, {
          method: "POST",
          headers: { "idempotency-key": crypto.randomUUID() },
          body,
        }),
      );
    },
    onSuccess: async (data: { id: string }) => {
      setTrackedGenerationIds((current) =>
        current.includes(data.id) ? current : [...current, data.id],
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["generations", project.id] }),
        invalidateCredits("reservation"),
      ]);
    },
    onError: reconcileInsufficientCredits,
  });
  const indexedGenerations = useMemo(
    () => {
      const items = generationsQuery.data?.items ?? [];
      const labels = buildGenerationLabels(items);
      return items
        .map((generation) => ({
          generation,
          variantNumber: labels.get(generation.id) ?? "—",
        }))
        .sort(
          (left, right) =>
            left.generation.createdAt.localeCompare(
              right.generation.createdAt,
            ) ||
            left.generation.id.localeCompare(right.generation.id),
        );
    },
    [generationsQuery.data],
  );
  const canvasGenerationInstances = useMemo(() => {
    const byId = new Map(
      indexedGenerations.map((item) => [item.generation.id, item]),
    );
    return [
      ...indexedGenerations.map((item) => ({
        ...item,
        nodeId: item.generation.id,
        duplicated: false,
      })),
      ...duplicatedGenerationInstances.flatMap((instance) => {
        const item = byId.get(instance.generationId);
        return item
          ? [
              {
                ...item,
                nodeId: instance.nodeId,
                duplicated: true,
              },
            ]
          : [];
      }),
    ].filter((item) => !hiddenCanvasItemIds.has(item.nodeId));
  }, [
    duplicatedGenerationInstances,
    hiddenCanvasItemIds,
    indexedGenerations,
  ]);
  const generationError = createGeneration.error;
  const generationErrorCode =
    generationError instanceof ApiResponseError ? generationError.code : null;
  const rootWalletPresentation = generationWalletPresentation(
    creditsQuery.data,
    "root",
    generationErrorCode,
  );
  const inspectorDataError =
    creditsQuery.error?.message ?? configQuery.error?.message ?? null;
  const inspectorDataLoading =
    creditsQuery.isLoading || configQuery.isLoading;
  const disabledReasons: string[] = [];
  if (createGeneration.isPending) {
    disabledReasons.push("Генерация уже запускается.");
  }
  if (creditsQuery.isLoading) {
    disabledReasons.push("Загружаем доступные параметры.");
  }
  if (creditsQuery.isError) {
    disabledReasons.push("Не удалось проверить баланс кредитов.");
  }
  if (prompt.trim().length < 3) {
    disabledReasons.push("Опишите изменения минимум в трёх символах.");
  } else if (prompt.length > 4000) {
    disabledReasons.push("Сократите инструкцию до 4000 символов.");
  }
  if (rootWalletPresentation.disabledReason) {
    disabledReasons.push(rootWalletPresentation.disabledReason);
  }
  const canvasGenerations = canvasGenerationInstances.map(
    ({ generation, variantNumber, nodeId, duplicated }) => {
      const cancelIsCurrent =
        cancelGeneration.isPending &&
        cancelGeneration.variables === generation.id;
      const retryIsCurrent =
        retryGeneration.isPending &&
        retryGeneration.variables?.generation.id === generation.id;
      const actionError = generationCanvasActionErrorPresentation({
        generationId: generation.id,
        status: generation.status,
        cancellationFailure:
          cancelGeneration.isError && cancelGeneration.variables
            ? {
                generationId: cancelGeneration.variables,
                error: cancelGeneration.error,
              }
            : null,
        retryFailure:
          retryGeneration.isError && retryGeneration.variables
            ? {
                generationId: retryGeneration.variables.generation.id,
                error: retryGeneration.error,
              }
            : null,
      });

      return {
        id: nodeId,
        ariaLabel: `Вариант ${variantNumber}${
          duplicated ? ", копия" : ""
        }, статус ${generation.status}`,
        height: 610,
        node: (
          <GenerationCanvasCard
            generation={generation}
            variantNumber={`${variantNumber}${duplicated ? " · копия" : ""}`}
            selected={selectedCanvasItem === nodeId}
            editorRef={refinementPromptRef}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            onHistoryStateChange={setHistoryState}
            onEditorError={setCanvasActionError}
            cancelPending={cancelIsCurrent}
            retryPending={retryIsCurrent}
            actionError={actionError}
            onCancel={() => cancelGeneration.mutate(generation.id)}
            onRetry={() =>
              retryGeneration.mutate(
                retryAttempts.begin(generation),
              )
            }
            onRemove={() => {
              setHiddenCanvasItemIds((current) => {
                const next = new Set(current);
                next.add(nodeId);
                return next;
              });
              if (selectedCanvasItem === nodeId) {
                setSelectedCanvasItem("source");
              }
              if (refinementEditorNodeId === nodeId) {
                setRefinementEditorNodeId(null);
              }
              if (openedResult?.generationId === generation.id) {
                setOpenedResult(null);
              }
            }}
            onOpenResult={(resultUrl) => {
              setSelectedCanvasItem(generation.id);
              setOpenedResult({
                generationId: generation.id,
                resultUrl,
              });
            }}
          />
        ),
      };
    },
  );
  const selectedCanvasGeneration = canvasGenerationInstances.find(
    (item) => item.nodeId === selectedCanvasItem,
  );
  const selectedGeneration = selectedCanvasGeneration?.generation;
  const refinementEditorOpen =
    refinementEditorNodeId === selectedCanvasItem &&
    selectedGeneration?.status === "SUCCEEDED";

  function setRefinementEditor(
    action: "select" | "toggle" | "close" | "submit-success",
  ) {
    if (!selectedCanvasGeneration) {
      setRefinementEditorNodeId(null);
      return;
    }
    const next = nextRefinementOverlayState(
      { editorOpen: refinementEditorOpen },
      action,
    );
    setRefinementEditorNodeId(
      next.editorOpen ? selectedCanvasGeneration.nodeId : null,
    );
  }

  function duplicateSelectedGeneration() {
    if (!selectedCanvasGeneration) return;
    const nodeId = `copy:${crypto.randomUUID()}`;
    setDuplicatedGenerationInstances((current) => [
      ...current,
      {
        nodeId,
        generationId: selectedCanvasGeneration.generation.id,
      },
    ]);
    setSelectedCanvasItem(nodeId);
    setRefinementEditorNodeId(null);
  }

  function removeSelectedGeneration() {
    if (!selectedCanvasGeneration) return;
    setHiddenCanvasItemIds((current) => {
      const next = new Set(current);
      next.add(selectedCanvasGeneration.nodeId);
      return next;
    });
    if (
      openedResult?.generationId === selectedCanvasGeneration.generation.id
    ) {
      setOpenedResult(null);
    }
    setSelectedCanvasItem("source");
    setRefinementEditorNodeId(null);
  }

  const selectedGenerationOverlay =
    selectedCanvasGeneration &&
    selectedGeneration?.status === "SUCCEEDED" &&
    selectedGeneration.resultUserId ? (
      <GenerationContextOverlay
        editorOpen={refinementEditorOpen}
        onToggleEditor={() => setRefinementEditor("toggle")}
        onDuplicate={duplicateSelectedGeneration}
        onRemove={removeSelectedGeneration}
        composer={
          <GenerationRefinementComposer
            generationId={selectedGeneration.id}
            userScope={project.id}
            balance={creditsQuery.data?.balance}
            generationCost={creditsQuery.data?.generationCost}
            initialReferenceFileIds={selectedGeneration.references.map(
              (reference) => reference.fileId,
            )}
            pending={
              createRefinement.isPending &&
              createRefinement.variables?.generationId ===
                selectedGeneration.id
            }
            error={
              createRefinement.isError &&
              createRefinement.variables?.generationId ===
                selectedGeneration.id
                ? createRefinement.error.message
                : null
            }
            errorCode={
              createRefinement.isError &&
              createRefinement.variables?.generationId ===
                selectedGeneration.id &&
              createRefinement.error instanceof ApiResponseError
                ? createRefinement.error.code
                : null
            }
            onClose={() => setRefinementEditor("close")}
            onSubmit={async (input) => {
              await createRefinement.mutateAsync({
                generationId: selectedGeneration.id,
                ...input,
              });
              setRefinementEditor("submit-success");
            }}
          />
        }
      />
    ) : null;
  const openedGeneration = openedResult
    ? indexedGenerations.find(
        ({ generation }) => generation.id === openedResult.generationId,
      )?.generation
    : undefined;

  function openInspector() {
    setInspectorOpen(true);
  }

  async function clearVisualPrompt() {
    if (
      !window.confirm(
        "Восстановить исходное изображение и очистить всю разметку? Исходник, проект, история генераций и референсы останутся без изменений.",
      )
    ) {
      return;
    }

    const editor =
      selectedCanvasItem === "source"
        ? visualPromptRef.current
        : refinementPromptRef.current;
    if (!editor) {
      setCanvasActionError("Редактор разметки ещё не готов");
      return;
    }

    try {
      await editor.clear();
      if (selectedCanvasItem === "source") {
        await editor.persist();
      }
    } catch (error) {
      setCanvasActionError(
        error instanceof Error
          ? error.message
          : "Не удалось очистить сохранённую разметку",
      );
    }
  }

  function closeInspector() {
    const dialog = inspectorDialogRef.current;
    if (dialog?.open) {
      dialog.close();
      return;
    }
    setInspectorOpen(false);
    requestAnimationFrame(() => {
      if (inspectorTriggerRef.current?.offsetParent !== null) {
        inspectorTriggerRef.current?.focus();
      }
    });
  }

  useEffect(() => {
    const dialog = inspectorDialogRef.current;
    if (!dialog || !inspectorOpen || dialog.open) return;
    dialog.showModal();
  }, [inspectorOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1200px)");
    const updateInspectorMode = () => {
      if (desktop.matches) {
        if (inspectorDialogRef.current?.open) {
          inspectorDialogRef.current.close();
        }
        setInspectorOpen(false);
      }
      setDesktopInspector(desktop.matches);
    };
    updateInspectorMode();
    desktop.addEventListener("change", updateInspectorMode);
    return () => desktop.removeEventListener("change", updateInspectorMode);
  }, []);

  return (
    <div className="canvas-workspace flex h-full min-h-0 flex-col">
      <WorkspaceHeader
        projectId={project.id}
        initialName={project.name}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() =>
          void (selectedCanvasItem === "source"
            ? visualPromptRef.current
            : refinementPromptRef.current
          )?.undo()
        }
        onRedo={() =>
          void (selectedCanvasItem === "source"
            ? visualPromptRef.current
            : refinementPromptRef.current
          )?.redo()
        }
      />
      <div className="grid min-h-0 flex-1 min-[1200px]:grid-cols-[minmax(0,1fr)_380px]">
        <section className="relative min-h-0 overflow-hidden bg-background" aria-label="Холст проекта">
          <SourceReplaceControl projectId={project.id} />
          <button
            ref={inspectorTriggerRef}
            type="button"
            onClick={openInspector}
            className="absolute top-3 right-3 z-20 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold shadow-xl transition-colors hover:bg-secondary min-[1200px]:hidden"
            aria-label="Открыть настройки интерьера"
            aria-haspopup="dialog"
            aria-expanded={inspectorOpen}
          >
            <Settings2 size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Новый интерьер</span>
          </button>
          <CanvasViewport
            source={{
              projectId: project.id,
              imageUrl: source.url,
              width: source.width,
              height: source.height,
              initialState: source.initialCanvasState,
            }}
            generations={canvasGenerations}
            selectedItemId={selectedCanvasItem}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            editorRef={visualPromptRef}
            selectedGenerationOverlay={selectedGenerationOverlay}
            selectedGenerationOverlaySize={
              refinementEditorOpen
                ? { width: 560, height: 560 }
                : { width: 640, height: 64 }
            }
            onHistoryStateChange={setHistoryState}
            onEditorError={setCanvasActionError}
            onSelectItem={(itemId) => {
              setSelectedCanvasItem(itemId);
              setRefinementEditorNodeId(null);
            }}
          />
          {generationsQuery.isError || canvasActionError ? (
            <div
              role="alert"
              className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-red-400/30 bg-surface px-4 py-3 text-sm text-red-300 shadow-xl"
            >
              {canvasActionError ?? generationsQuery.error?.message}
            </div>
          ) : null}
          <WorkspaceToolbar
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            canUndo={canUndo}
            canRedo={canRedo}
            onToolChange={setTool}
            onColorChange={setColor}
            onStrokeWidthChange={setStrokeWidth}
            onUndo={() =>
              void (selectedCanvasItem === "source"
                ? visualPromptRef.current
                : refinementPromptRef.current
              )?.undo()
            }
            onRedo={() =>
              void (selectedCanvasItem === "source"
                ? visualPromptRef.current
                : refinementPromptRef.current
              )?.redo()
            }
            onDelete={() =>
              (selectedCanvasItem === "source"
                ? visualPromptRef.current
                : refinementPromptRef.current
              )?.deleteSelected()
            }
            onClear={() => void clearVisualPrompt()}
          />
        </section>
        <dialog
          ref={inspectorDialogRef}
          open={desktopInspector || undefined}
          aria-labelledby="design-inspector-title"
          onCancel={(event) => {
            event.preventDefault();
            closeInspector();
          }}
          onClose={() => {
            setInspectorOpen(false);
            requestAnimationFrame(() => {
              if (inspectorTriggerRef.current?.offsetParent !== null) {
                inspectorTriggerRef.current?.focus();
              }
            });
          }}
          className={`fixed inset-0 z-50 m-0 h-full max-h-dvh w-full max-w-none flex-col overflow-hidden overscroll-contain border-0 bg-card p-0 pb-[env(safe-area-inset-bottom)] text-foreground shadow-2xl backdrop:bg-black/70 ${
            inspectorOpen ? "flex" : "hidden"
          } md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[380px] md:border-l md:border-border md:pb-0 min-[1200px]:static min-[1200px]:flex min-[1200px]:min-h-0 min-[1200px]:w-[380px] min-[1200px]:shadow-none`}
        >
          <div className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-5 pt-[env(safe-area-inset-top)] md:pt-0">
            <div>
              <h2
                id="design-inspector-title"
                className="text-xs font-black uppercase tracking-[0.18em] text-accent"
              >
                Новый интерьер
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Стиль, формат и ваши изменения</p>
            </div>
            <button
              type="button"
              onClick={closeInspector}
              className="grid size-11 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-elevated hover:text-foreground min-[1200px]:hidden"
              aria-label="Закрыть настройки интерьера"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>
          <DesignInspector
            projectId={project.id}
            initialReferences={initialReferences}
            prompt={prompt}
            onPromptChange={setPrompt}
            styles={configQuery.data ?? []}
            styleCode={styleCode}
            onStyleChange={setStyleCode}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            credits={creditsQuery.data}
            dataLoading={inspectorDataLoading}
            dataError={inspectorDataError}
            generationPending={createGeneration.isPending}
            generationError={generationError?.message ?? null}
            generationErrorCode={generationErrorCode}
            disabledReasons={disabledReasons}
            onGenerate={() => createGeneration.mutate()}
          />
        </dialog>
      </div>
      {openedGeneration && openedResult ? (
        <ResultActions
          generation={openedGeneration}
          sourceUrl={source.url}
          resultUrl={openedResult.resultUrl}
          onClose={() => setOpenedResult(null)}
          onGenerateVariation={async () => {
            await createGeneration.mutateAsync();
          }}
        />
      ) : null}
    </div>
  );
}
