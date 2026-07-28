"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Settings2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasViewport } from "@/components/design/canvas-viewport";
import { DesignInspector } from "@/components/design/design-inspector";
import { EmptySourceWorkspace } from "@/components/design/empty-source-workspace";
import { GenerationCanvasCard } from "@/components/design/generation-canvas-card";
import { GenerationRefinementComposer } from "@/components/design/generation-refinement-composer";
import { ResultActions } from "@/components/design/result-actions";
import { SourceReplaceControl } from "@/components/design/source-replace-control";
import { WorkspaceHeader } from "@/components/design/workspace-header";
import { WorkspaceToolbar } from "@/components/design/workspace-toolbar";
import type { DesignWorkspaceProps, WorkspaceGeneration, WorkspaceGenerationStatus } from "@/components/design/workspace-types";
import { buildGenerationLabels } from "@/features/generations/tree";
import type { VisualPromptEditorHandle, VisualPromptTool } from "@/features/visual-prompt/types";

type GenerationList = {
  items: WorkspaceGeneration[];
  nextCursor: string | null;
  total: number;
};

type Style = { code: string; name: string; imageUrl: string };
type Usage = {
  used: number;
  limit: number | null;
  remaining: number | null;
  timezone: string;
  plan: {
    code: string;
    name: string;
    watermarkRequired: boolean;
  };
};

const DEFAULT_PROMPT =
  "Сделай современный ремонт. Используй предметы интерьера из референсов. Не меняй ракурс, пропорции и геометрию помещения.";

async function readJson(response: Response) {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Запрос не выполнен");
  return payload.data;
}

function isActiveGeneration(status: WorkspaceGenerationStatus) {
  return status === "QUEUED" || status === "PROCESSING";
}

function isTerminalGeneration(status: WorkspaceGenerationStatus) {
  return (
    status === "SUCCEEDED" ||
    status === "FAILED" ||
    status === "REJECTED" ||
    status === "CANCELLED"
  );
}

function terminalCompletionSignature(generation: WorkspaceGeneration) {
  return `${generation.id}:${generation.status}:${generation.completedAt ?? "terminal"}`;
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
  const observedTerminalSignaturesRef = useRef(new Set<string>());
  const observedPointTerminalIdsRef = useRef(new Set<string>());
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
  const [hiddenGenerationIds, setHiddenGenerationIds] = useState<Set<string>>(
    () => new Set(),
  );
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
  const [{ canUndo, canRedo }, setHistoryState] = useState({
    canUndo: false,
    canRedo: false,
  });

  const generationsQuery = useQuery({
    queryKey: ["generations", project.id],
    queryFn: async () => readJson(await fetch(`/api/v1/generations?projectId=${project.id}&limit=20`)) as Promise<GenerationList>,
  });
  const configQuery = useQuery({
    queryKey: ["config"],
    queryFn: async () => (await readJson(await fetch("/api/v1/config"))).interiorStyles as Style[],
  });
  const usageQuery = useQuery({
    queryKey: ["usage", "today"],
    queryFn: async () => readJson(await fetch("/api/v1/usage/today")) as Promise<Usage | null>,
  });

  useEffect(() => {
    const terminalSignatures =
      generationsQuery.data?.items
        .filter((generation) => isTerminalGeneration(generation.status))
        .map(terminalCompletionSignature) ?? [];
    let hasNewTerminalCompletion = false;
    terminalSignatures.forEach((signature) => {
      if (observedTerminalSignaturesRef.current.has(signature)) return;
      observedTerminalSignaturesRef.current.add(signature);
      hasNewTerminalCompletion = true;
    });

    if (hasNewTerminalCompletion) {
      void queryClient.invalidateQueries({ queryKey: ["usage", "today"] });
    }
  }, [generationsQuery.data?.items, queryClient]);

  async function reserveCurrentGeneration() {
    if (prompt.trim().length < 3) {
      throw new Error("Опишите изменения не менее чем в трёх символах");
    }
    if (!visualPromptRef.current) {
      throw new Error("Редактор разметки ещё не готов");
    }

    await visualPromptRef.current.persist();

    return readJson(
      await fetch("/api/v1/generations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
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
    mutationFn: reserveCurrentGeneration,
    onSuccess: async (data: { id: string }) => {
      setTrackedGenerationIds((current) =>
        current.includes(data.id) ? current : [...current, data.id],
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["generations", project.id] }),
        queryClient.invalidateQueries({ queryKey: ["usage", "today"] }),
      ]);
    },
  });
  const cancelGeneration = useMutation({
    mutationFn: async (generationId: string) =>
      readJson(
        await fetch(`/api/v1/generations/${generationId}/cancel`, {
          method: "POST",
        }),
      ),
    onSuccess: async (data: { id: string }) => {
      setTrackedGenerationIds((current) =>
        current.includes(data.id) ? current : [...current, data.id],
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["generations", project.id] }),
        queryClient.invalidateQueries({ queryKey: ["usage", "today"] }),
      ]);
    },
  });
  const retryGeneration = useMutation({
    mutationFn: async (generation: WorkspaceGeneration) => {
      if (generation.status === "REJECTED") {
        return reserveCurrentGeneration();
      }
      if (!visualPromptRef.current) {
        throw new Error("Редактор разметки ещё не готов");
      }

      await visualPromptRef.current.persist();

      return readJson(
        await fetch(`/api/v1/generations/${generation.id}/retry`, {
          method: "POST",
        }),
      );
    },
    onSuccess: async (data: { id: string }) => {
      setTrackedGenerationIds((current) =>
        current.includes(data.id) ? current : [...current, data.id],
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["generations", project.id] }),
        queryClient.invalidateQueries({ queryKey: ["usage", "today"] }),
      ]);
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
        readJson(
          await fetch(`/api/v1/generations/${generationId}`),
        ) as Promise<WorkspaceGeneration>,
      refetchInterval: (query: {
        state: { data?: WorkspaceGeneration };
      }) =>
        query.state.data && !isActiveGeneration(query.state.data.status)
          ? false
          : 1500,
    })),
  });

  useEffect(() => {
    for (const query of activeGenerationQueries) {
      const generation = query.data;
      if (
        !generation ||
        isActiveGeneration(generation.status) ||
        observedPointTerminalIdsRef.current.has(generation.id)
      ) {
        continue;
      }
      observedPointTerminalIdsRef.current.add(generation.id);
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["generations", project.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["usage", "today"] }),
      ]);
    }
  }, [activeGenerationQueries, project.id, queryClient]);
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
        const uploaded = await readJson(
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
      return readJson(
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
        queryClient.invalidateQueries({ queryKey: ["usage", "today"] }),
      ]);
    },
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
  const visibleGenerations = indexedGenerations.filter(
    ({ generation }) => !hiddenGenerationIds.has(generation.id),
  );
  const generationError = createGeneration.error;
  const inspectorDataError =
    usageQuery.error?.message ?? configQuery.error?.message ?? null;
  const inspectorDataLoading =
    usageQuery.isLoading || configQuery.isLoading;
  const disabledReasons: string[] = [];
  if (createGeneration.isPending) {
    disabledReasons.push("Генерация уже запускается.");
  }
  if (usageQuery.isLoading) {
    disabledReasons.push("Загружаем доступные параметры.");
  }
  if (usageQuery.isError) {
    disabledReasons.push("Не удалось проверить дневной лимит.");
  }
  if (prompt.trim().length < 3) {
    disabledReasons.push("Опишите изменения минимум в трёх символах.");
  } else if (prompt.length > 4000) {
    disabledReasons.push("Сократите инструкцию до 4000 символов.");
  }
  if (usageQuery.data?.remaining === 0) {
    disabledReasons.push("Дневной лимит генераций исчерпан.");
  }
  const canvasGenerations = visibleGenerations.map(
    ({ generation, variantNumber }) => {
      const cancelIsCurrent =
        cancelGeneration.isPending &&
        cancelGeneration.variables === generation.id;
      const retryIsCurrent =
        retryGeneration.isPending &&
        retryGeneration.variables?.id === generation.id;
      const actionError =
        cancelGeneration.isError &&
        cancelGeneration.variables === generation.id
          ? cancelGeneration.error?.message
          : retryGeneration.isError &&
              retryGeneration.variables?.id === generation.id
            ? retryGeneration.error?.message
            : null;

      return {
        id: generation.id,
        ariaLabel: `Вариант ${variantNumber}, статус ${generation.status}`,
        height:
          selectedCanvasItem === generation.id &&
          generation.status === "SUCCEEDED"
            ? 850
            : 610,
        node: (
          <GenerationCanvasCard
            generation={generation}
            variantNumber={variantNumber}
            selected={selectedCanvasItem === generation.id}
            editorRef={refinementPromptRef}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            onHistoryStateChange={setHistoryState}
            onEditorError={setCanvasActionError}
            refinementComposer={
              <GenerationRefinementComposer
                generationId={generation.id}
                userScope={project.id}
                initialReferenceFileIds={generation.references.map(
                  (reference) => reference.fileId,
                )}
                pending={
                  createRefinement.isPending &&
                  createRefinement.variables?.generationId === generation.id
                }
                error={
                  createRefinement.isError &&
                  createRefinement.variables?.generationId === generation.id
                    ? createRefinement.error.message
                    : null
                }
                onSubmit={async (input) => {
                  await createRefinement.mutateAsync({
                    generationId: generation.id,
                    ...input,
                  });
                }}
              />
            }
            cancelPending={cancelIsCurrent}
            retryPending={retryIsCurrent}
            actionError={actionError}
            onCancel={() => cancelGeneration.mutate(generation.id)}
            onRetry={() => retryGeneration.mutate(generation)}
            onRemove={() => {
              setHiddenGenerationIds((current) => {
                const next = new Set(current);
                next.add(generation.id);
                return next;
              });
              if (selectedCanvasItem === generation.id) {
                setSelectedCanvasItem("source");
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
            className="absolute top-3 right-3 z-20 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-black shadow-xl transition-colors hover:bg-surface-elevated min-[1200px]:hidden"
            aria-label="Открыть AI-настройки"
            aria-haspopup="dialog"
            aria-expanded={inspectorOpen}
          >
            <Settings2 size={18} aria-hidden="true" />
            <span className="hidden sm:inline">AI-настройки</span>
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
            onHistoryStateChange={setHistoryState}
            onEditorError={setCanvasActionError}
            onSelectItem={setSelectedCanvasItem}
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
          className={`fixed inset-0 z-50 m-0 h-full max-h-dvh w-full max-w-none flex-col overflow-hidden overscroll-contain border-0 bg-surface p-0 pb-[env(safe-area-inset-bottom)] text-foreground shadow-2xl backdrop:bg-black/65 ${
            inspectorOpen ? "flex" : "hidden"
          } md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[380px] md:border-l md:border-border md:pb-0 min-[1200px]:static min-[1200px]:flex min-[1200px]:min-h-0 min-[1200px]:w-[380px] min-[1200px]:shadow-none`}
        >
          <div className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-5 pt-[env(safe-area-inset-top)] md:pt-0">
            <div>
              <h2
                id="design-inspector-title"
                className="text-xs font-black uppercase tracking-[0.18em] text-accent"
              >
                AI-настройки
              </h2>
              <p className="mt-1 text-xs text-muted">Параметры нового дизайна</p>
            </div>
            <button
              type="button"
              onClick={closeInspector}
              className="grid size-11 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-elevated hover:text-foreground min-[1200px]:hidden"
              aria-label="Закрыть AI-настройки"
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
            usage={usageQuery.data}
            dataLoading={inspectorDataLoading}
            dataError={inspectorDataError}
            generationPending={createGeneration.isPending}
            generationError={generationError?.message ?? null}
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
