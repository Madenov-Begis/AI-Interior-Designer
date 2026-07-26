"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasViewport } from "@/components/design/canvas-viewport";
import { DesignInspector } from "@/components/design/design-inspector";
import { EmptySourceWorkspace } from "@/components/design/empty-source-workspace";
import { GenerationCanvasCard } from "@/components/design/generation-canvas-card";
import { ResultActions } from "@/components/design/result-actions";
import { SourceReplaceControl } from "@/components/design/source-replace-control";
import { WorkspaceHeader } from "@/components/design/workspace-header";
import { WorkspaceToolbar } from "@/components/design/workspace-toolbar";
import type { DesignWorkspaceProps, WorkspaceGeneration, WorkspaceGenerationStatus } from "@/components/design/workspace-types";
import type { VisualPromptEditorHandle, VisualPromptTool } from "@/features/visual-prompt/types";

type GenerationList = {
  items: WorkspaceGeneration[];
  nextCursor: string | null;
  total: number;
};

type Model = {
  code: string;
  name: string;
  supportedAspectRatios: string[];
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
  const observedTerminalSignaturesRef = useRef(new Set<string>());
  const inspectorDialogRef = useRef<HTMLDialogElement>(null);
  const inspectorTriggerRef = useRef<HTMLButtonElement>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [desktopInspector, setDesktopInspector] = useState(false);
  const [prompt, setPrompt] = useState(project.prompt ?? DEFAULT_PROMPT);
  const [modelCode, setModelCode] = useState("");
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
    refetchInterval: (query) => query.state.data?.items.some((item) => isActiveGeneration(item.status)) ? 1500 : false,
  });
  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: async () => (await readJson(await fetch("/api/v1/models"))).models as Model[],
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

  const selectedModelCode = modelCode || modelsQuery.data?.[0]?.code || "";
  const selectedModel = modelsQuery.data?.find(
    (model) => model.code === selectedModelCode,
  );
  const selectedAspectRatio =
    selectedModel?.supportedAspectRatios.includes(aspectRatio)
      ? aspectRatio
      : selectedModel?.supportedAspectRatios[0] ?? "";

  async function reserveCurrentGeneration() {
    if (!selectedModelCode) throw new Error("Выберите модель");
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
          modelCode: selectedModelCode,
          aspectRatio: selectedAspectRatio,
          styleCode,
        }),
      }),
    );
  }

  const createGeneration = useMutation({
    mutationFn: reserveCurrentGeneration,
    onSuccess: async () => {
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
    onSuccess: async () => {
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["generations", project.id] }),
        queryClient.invalidateQueries({ queryKey: ["usage", "today"] }),
      ]);
    },
  });
  const indexedGenerations = useMemo(
    () => {
      const items = generationsQuery.data?.items ?? [];
      const total = generationsQuery.data?.total ?? items.length;
      return items
        .map((generation, descendingIndex) => ({
          generation,
          variantNumber: total - descendingIndex,
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
    modelsQuery.error?.message ??
    usageQuery.error?.message ??
    configQuery.error?.message ??
    null;
  const inspectorDataLoading =
    modelsQuery.isLoading || usageQuery.isLoading || configQuery.isLoading;
  const disabledReasons: string[] = [];
  if (createGeneration.isPending) {
    disabledReasons.push("Генерация уже запускается.");
  }
  if (modelsQuery.isLoading || usageQuery.isLoading) {
    disabledReasons.push("Загружаем доступные параметры.");
  }
  if (modelsQuery.isError || usageQuery.isError) {
    disabledReasons.push("Не удалось проверить модель или дневной лимит.");
  }
  if (!modelsQuery.isLoading && !modelsQuery.isError && !selectedModelCode) {
    disabledReasons.push("Нет доступной модели.");
  }
  if (!selectedAspectRatio) {
    disabledReasons.push("Для модели не найден доступный формат.");
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
        node: (
          <GenerationCanvasCard
            generation={generation}
            variantNumber={variantNumber}
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

    const editor = visualPromptRef.current;
    if (!editor) {
      setCanvasActionError("Редактор разметки ещё не готов");
      return;
    }

    try {
      // Both operations are enqueued immediately in this order, preserving the
      // editor's total FIFO across drawing, history, and generation actions.
      const clearOperation = editor.clear();
      const persistOperation = editor.persist();
      await clearOperation;
      await persistOperation;
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
        onUndo={() => void visualPromptRef.current?.undo()}
        onRedo={() => void visualPromptRef.current?.redo()}
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
            onUndo={() => void visualPromptRef.current?.undo()}
            onRedo={() => void visualPromptRef.current?.redo()}
            onDelete={() => visualPromptRef.current?.deleteSelected()}
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
            models={modelsQuery.data ?? []}
            modelCode={selectedModelCode}
            onModelChange={(nextModelCode) => {
              setModelCode(nextModelCode);
              const nextModel = modelsQuery.data?.find(
                (model) => model.code === nextModelCode,
              );
              if (
                nextModel &&
                !nextModel.supportedAspectRatios.includes(aspectRatio)
              ) {
                setAspectRatio(nextModel.supportedAspectRatios[0] ?? "");
              }
            }}
            aspectRatio={selectedAspectRatio}
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
