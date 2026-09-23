"use client";

import { useQuery } from "@tanstack/react-query";
import { mediaQueries } from "@/shared/api/media.query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasViewport, type CanvasViewportHandle } from "./canvas-viewport";
import { CanvasOnboarding, CanvasOnboardingTrigger } from "./canvas-onboarding";
import { EmptySourceWorkspace } from "./empty-source-workspace";
import { ResultActions } from "./result-actions";
import { WorkspaceGenerationNode } from "./workspace-generation-nodes";
import { WorkspaceGenerationOverlay } from "./workspace-generation-overlay";
import { WorkspaceToolbar } from "./workspace-toolbar";
import {
  useWorkspaceInspectorPanel,
  WorkspaceInspectorPanel,
  WorkspaceInspectorTrigger,
} from "./workspace-inspector-panel";
import type { DesignWorkspaceProps } from "../model/workspace-types";
import {
  nearestGenerationAspectRatio,
  resolveGenerationAspectRatio,
} from "../model/generation-aspect-ratio";
import { useWorkspaceGenerationActions } from "../model/workspace-generation-actions";
import { useWorkspaceGenerationFeed } from "../model/workspace-generation-feed";
import { CANVAS_ONBOARDING_STEP } from "../model/canvas-onboarding";
import { useCanvasOnboarding } from "../model/use-canvas-onboarding";
import {
  useGenerationDraft,
  type GenerationDraft,
} from "../model/use-generation-draft";
import { nextRefinementOverlayState } from "@/features/generate-design";
import {
  ApiResponseError,
  generationWalletPresentation,
} from "@/features/generate-design";
import { useAppSession } from "@/features/auth/index.client";
import { buildGenerationLabels } from "@/features/generate-design";
import { INTERIOR_STYLES } from "@/features/generate-design";
import type {
  VisualPromptEditorHandle,
  VisualPromptTool,
} from "@/features/visual-prompt";
import { useAppText } from "@/shared/providers";

type ReadyDesignWorkspaceProps = Omit<DesignWorkspaceProps, "project"> & {
  draft: GenerationDraft;
  project: DesignWorkspaceProps["project"] & {
    source: NonNullable<DesignWorkspaceProps["project"]["source"]>;
  };
};

const statusLabelsForAria = {
  QUEUED: "В очереди",
  PROCESSING: "Создаётся",
  SUCCEEDED: "Готово",
  FAILED: "Ошибка",
  REJECTED: "Отклонено",
  CANCELLED: "Отменено",
} as const;

export function DesignWorkspace(props: DesignWorkspaceProps) {
  const draft = useGenerationDraft();
  if (!props.project.source) {
    return (
      <EmptySourceWorkspace
        projectId={props.project.id}
        initialReferences={props.initialReferences}
        draft={draft}
      />
    );
  }

  return (
    <ReadyDesignWorkspace
      project={{ ...props.project, source: props.project.source }}
      initialReferences={props.initialReferences}
      initialGenerations={props.initialGenerations}
      draft={draft}
    />
  );
}

function ReadyDesignWorkspace({
  project,
  initialReferences,
  initialGenerations,
  draft,
}: ReadyDesignWorkspaceProps) {
  const t = useAppText();
  const source = project.source;
  const sourceUrl = useQuery(
    mediaQueries.signedUrl(source.fileId, source.url, source.expiresAt),
  );
  const { wallet } = useAppSession();
  const onboarding = useCanvasOnboarding();
  const onboardingActive = onboarding.active;
  const onboardingStep = onboarding.step;
  const visualPromptRef = useRef<VisualPromptEditorHandle | null>(null);
  const refinementPromptRef = useRef<VisualPromptEditorHandle | null>(null);
  const canvasViewportRef = useRef<CanvasViewportHandle | null>(null);
  const {
    dialogRef: inspectorDialogRef,
    dialogNode: inspectorDialogNode,
    triggerRef: inspectorTriggerRef,
    open: inspectorOpen,
    desktop: desktopInspector,
    show: openInspector,
    close: closeInspector,
    onClosed: handleInspectorClosed,
  } = useWorkspaceInspectorPanel();
  const [pendingCanvasFocusId, setPendingCanvasFocusId] = useState<
    string | null
  >(null);
  const {
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    styleCode,
    setStyleCode,
    setRoomTypeId,
    roomsQuery,
    availableRoomTypeId,
  } = draft;
  const sourceAspectRatio = nearestGenerationAspectRatio(
    source.sourceWidth,
    source.sourceHeight,
  );
  const resolvedAspectRatio = resolveGenerationAspectRatio(
    aspectRatio,
    source.sourceWidth,
    source.sourceHeight,
  );
  const refetchRooms = roomsQuery.refetch;
  const handleRootGenerationError = useCallback(
    (error: Error) => {
      if (
        error instanceof ApiResponseError &&
        error.code === "ROOM_NOT_AVAILABLE"
      ) {
        setRoomTypeId(undefined);
        void refetchRooms();
      }
    },
    [refetchRooms, setRoomTypeId],
  );
  const [selectedCanvasItem, setSelectedCanvasItem] =
    useState<string>("source");
  const [refinementEditorNodeId, setRefinementEditorNodeId] = useState<
    string | null
  >(null);
  const [openedResult, setOpenedResult] = useState<{
    generationId: string;
    resultUrl: string;
  } | null>(null);
  const [tool, setTool] = useState<VisualPromptTool>("select");
  const [color, setColor] = useState("#afea4d");
  const [drawingStrokeWidth, setDrawingStrokeWidth] = useState(12);
  const [eraserWidth, setEraserWidth] = useState(40);
  const strokeWidth = tool === "eraser" ? eraserWidth : drawingStrokeWidth;
  const [canvasActionError, setCanvasActionError] = useState<string | null>(
    null,
  );
  const [{ canUndo, canRedo }, setHistoryState] = useState({
    canUndo: false,
    canRedo: false,
  });

  const clearCurrentVisualPrompt = useCallback(async () => {
    const sourceSelected = selectedCanvasItem === "source";
    const editor = sourceSelected
      ? visualPromptRef.current
      : refinementPromptRef.current;

    if (!editor) {
      setCanvasActionError("Редактор разметки ещё не готов");
      return;
    }

    setCanvasActionError(null);
    try {
      await editor.clear();
      if (sourceSelected) await editor.persist();
    } catch (error) {
      setCanvasActionError(
        error instanceof Error ? error.message : "Не удалось очистить разметку",
      );
    }
  }, [selectedCanvasItem]);

  const focusGeneration = useCallback(
    (generationId: string) => {
      setSelectedCanvasItem(generationId);
      setPendingCanvasFocusId(generationId);
    },
    [setPendingCanvasFocusId, setSelectedCanvasItem],
  );
  const {
    generationsQuery,
    loadMore,
    applyGenerationPayload,
    invalidateCredits,
    reconcileInsufficientCredits,
  } = useWorkspaceGenerationFeed(project.id, initialGenerations);
  const {
    createGeneration,
    cancelGeneration,
    retryGeneration,
    createRefinement,
    submitRefinement,
    retryAttempts,
  } = useWorkspaceGenerationActions({
    projectId: project.id,
    prompt,
    aspectRatio: resolvedAspectRatio,
    styleCode,
    roomTypeId: availableRoomTypeId,
    visualPromptRef,
    refinementPromptRef,
    applyGenerationPayload,
    invalidateCredits,
    reconcileInsufficientCredits,
    focusGeneration,
    onRootGenerationSuccess: () => setRoomTypeId(undefined),
    onRootGenerationError: handleRootGenerationError,
  });
  const indexedGenerations = useMemo(() => {
    const items = generationsQuery.data?.items ?? [];
    const labels = buildGenerationLabels(items);
    return items
      .map((generation) => ({
        generation,
        variantNumber:
          generation.variantNumber ?? labels.get(generation.id) ?? "—",
      }))
      .sort(
        (left, right) =>
          left.generation.createdAt.localeCompare(right.generation.createdAt) ||
          left.generation.id.localeCompare(right.generation.id),
      );
  }, [generationsQuery.data]);
  const canvasGenerationInstances = useMemo(
    () =>
      indexedGenerations.map((item) => ({
        ...item,
        nodeId: item.generation.id,
      })),
    [indexedGenerations],
  );
  useEffect(() => {
    if (!onboardingActive) return;

    const inspectorStep =
      onboardingStep >= CANVAS_ONBOARDING_STEP.references &&
      onboardingStep <= CANVAS_ONBOARDING_STEP.generation;
    if (inspectorStep && !desktopInspector && !inspectorOpen) {
      openInspector();
      return;
    }
    if (
      onboardingStep === CANVAS_ONBOARDING_STEP.refinement &&
      !desktopInspector &&
      inspectorOpen
    ) {
      closeInspector();
    }
  }, [
    closeInspector,
    desktopInspector,
    inspectorOpen,
    onboardingActive,
    onboardingStep,
    openInspector,
  ]);
  useEffect(() => {
    if (
      !pendingCanvasFocusId ||
      !canvasGenerationInstances.some(
        (generation) => generation.nodeId === pendingCanvasFocusId,
      )
    ) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      canvasViewportRef.current?.focusItem(pendingCanvasFocusId);
      setPendingCanvasFocusId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [canvasGenerationInstances, pendingCanvasFocusId]);
  const generationError = createGeneration.error;
  const generationErrorCode =
    generationError instanceof ApiResponseError ? generationError.code : null;
  const rootWalletPresentation = generationWalletPresentation(
    wallet,
    "root",
    generationErrorCode,
  );
  const inspectorDataError = roomsQuery.error?.message ?? null;
  const inspectorDataLoading = roomsQuery.isLoading;
  const disabledReasons: string[] = [];
  if (createGeneration.isPending) {
    disabledReasons.push("Генерация уже запускается.");
  }
  if (prompt.trim().length < 3) {
    disabledReasons.push("Добавьте описание — минимум 3 символа.");
  } else if (prompt.length > 4000) {
    disabledReasons.push("Сократите инструкцию до 4000 символов.");
  }
  if (roomsQuery.isLoading) {
    disabledReasons.push("Загружаем список комнат.");
  } else if (roomsQuery.isError) {
    disabledReasons.push("Список комнат недоступен.");
  } else if ((roomsQuery.data?.items.length ?? 0) === 0) {
    disabledReasons.push("Администратор ещё не добавил доступные комнаты.");
  } else if (!availableRoomTypeId) {
    disabledReasons.push("Выберите комнату.");
  }
  if (rootWalletPresentation.disabledReason) {
    disabledReasons.push(rootWalletPresentation.disabledReason);
  }
  const canvasGenerations = canvasGenerationInstances.map((item) => ({
    id: item.nodeId,
    ariaLabel: t("Вариант {number}, статус {status}", {
      number: item.variantNumber,
      status: t(statusLabelsForAria[item.generation.status]),
    }),
    interactive:
      item.generation.status === "SUCCEEDED" &&
      Boolean(item.generation.resultUserId),
    node: (
      <WorkspaceGenerationNode
        item={item}
        selectedItemId={selectedCanvasItem}
        frameWidth={source.width}
        frameHeight={source.height}
        editorRef={refinementPromptRef}
        tool={tool}
        color={color}
        strokeWidth={strokeWidth}
        actions={{ cancelGeneration, retryGeneration, retryAttempts }}
        onHistoryStateChange={setHistoryState}
        onEditorError={setCanvasActionError}
        onOpenResult={(generationId, resultUrl) => {
          setSelectedCanvasItem(generationId);
          setOpenedResult({ generationId, resultUrl });
        }}
      />
    ),
  }));
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

  const selectedGenerationOverlay = (
    <WorkspaceGenerationOverlay
      selected={selectedCanvasGeneration}
      editorOpen={refinementEditorOpen}
      projectId={project.id}
      wallet={wallet}
      refinement={{ createRefinement, submitRefinement }}
      onToggleEditor={() => setRefinementEditor("toggle")}
      onCloseEditor={() => setRefinementEditor("close")}
      onSubmitSuccess={() => setRefinementEditor("submit-success")}
      onDismiss={() => {
        setSelectedCanvasItem("source");
        setRefinementEditorNodeId(null);
      }}
    />
  );
  const openedGeneration = openedResult
    ? indexedGenerations.find(
        ({ generation }) => generation.id === openedResult.generationId,
      )?.generation
    : undefined;

  return (
    <div
      className="canvas-workspace relative flex h-full min-h-0 flex-col overflow-hidden"
      data-onboarding="canvas"
    >
      <div className="grid min-h-0 flex-1 min-[1200px]:grid-cols-[minmax(0,1fr)_380px]">
        <section
          className="relative min-h-0 overflow-hidden bg-background"
          aria-label={t("Холст проекта")}
        >
          <CanvasOnboardingTrigger
            active={onboardingActive}
            onStart={onboarding.replay}
          />
          <WorkspaceInspectorTrigger
            triggerRef={inspectorTriggerRef}
            open={inspectorOpen}
            onOpen={openInspector}
          />
          <CanvasViewport
            ref={canvasViewportRef}
            source={{
              projectId: project.id,
              imageUrl: sourceUrl.data?.url ?? source.url,
              width: source.width,
              height: source.height,
              sourceWidth: source.sourceWidth,
              sourceHeight: source.sourceHeight,
              initialState: source.initialCanvasState,
            }}
            generations={canvasGenerations}
            selectedItemId={selectedCanvasItem}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            editorRef={visualPromptRef}
            selectedGenerationOverlay={selectedGenerationOverlay}
            selectedGenerationOverlaySize={{ width: 352, height: 42 }}
            onHistoryStateChange={setHistoryState}
            onEditorError={setCanvasActionError}
            onSelectItem={(itemId) => {
              setSelectedCanvasItem(itemId);
              setRefinementEditorNodeId(null);
            }}
            onActivateSource={openInspector}
          />
          {generationsQuery.data.nextCursor ? (
            <button
              type="button"
              className="absolute left-4 top-16 z-20 rounded-xl border bg-surface px-4 py-2 text-sm shadow"
              disabled={loadMore.isPending}
              onClick={() => loadMore.mutate()}
            >
              {loadMore.isPending
                ? t("Загрузка…")
                : t("Загрузить предыдущие варианты ({shown} из {total})", {
                    shown: generationsQuery.data.items.length,
                    total: generationsQuery.data.total,
                  })}
            </button>
          ) : null}
          {generationsQuery.isError || loadMore.isError || canvasActionError ? (
            <div
              role="alert"
              className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-red-400/30 bg-surface px-4 py-3 text-sm text-red-300 shadow-xl"
            >
              {t(
                canvasActionError ??
                  loadMore.error?.message ??
                  generationsQuery.error?.message ??
                  "Ошибка",
              )}
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
            onStrokeWidthChange={(width) => {
              if (tool === "eraser") setEraserWidth(width);
              else setDrawingStrokeWidth(width);
            }}
            onUndo={() =>
              void (
                selectedCanvasItem === "source"
                  ? visualPromptRef.current
                  : refinementPromptRef.current
              )?.undo()
            }
            onRedo={() =>
              void (
                selectedCanvasItem === "source"
                  ? visualPromptRef.current
                  : refinementPromptRef.current
              )?.redo()
            }
            onClear={() => void clearCurrentVisualPrompt()}
          />
        </section>
        <WorkspaceInspectorPanel
          dialogRef={inspectorDialogRef}
          dialogNode={inspectorDialogNode}
          open={inspectorOpen}
          desktop={desktopInspector}
          onClose={closeInspector}
          onClosed={handleInspectorClosed}
          inspectorProps={{
            projectId: project.id,
            initialReferences,
            prompt,
            onPromptChange: setPrompt,
            rooms: roomsQuery.data?.items ?? [],
            roomTypeId: availableRoomTypeId,
            onRoomTypeChange: setRoomTypeId,
            styles: [...INTERIOR_STYLES],
            styleCode,
            onStyleChange: setStyleCode,
            aspectRatio,
            sourceAspectRatio,
            onAspectRatioChange: setAspectRatio,
            credits: wallet,
            dataLoading: inspectorDataLoading,
            dataError: inspectorDataError,
            onDataRetry: () => void roomsQuery.refetch(),
            generationPending: createGeneration.isPending,
            generationError: generationError?.message ?? null,
            generationErrorCode,
            disabledReasons,
            onGenerate: () => createGeneration.mutate(),
          }}
        />
      </div>
      {openedGeneration && openedResult ? (
        <ResultActions
          generation={openedGeneration}
          resultUrl={openedResult.resultUrl}
          onClose={() => setOpenedResult(null)}
        />
      ) : null}
      <CanvasOnboarding
        active={onboardingActive}
        step={onboardingStep}
        targetReady={
          onboardingStep < CANVAS_ONBOARDING_STEP.references ||
          (onboardingStep <= CANVAS_ONBOARDING_STEP.generation
            ? desktopInspector || inspectorOpen
            : desktopInspector || !inspectorOpen)
        }
        onAdvance={onboarding.advance}
        onFinish={onboarding.finish}
      />
    </div>
  );
}
