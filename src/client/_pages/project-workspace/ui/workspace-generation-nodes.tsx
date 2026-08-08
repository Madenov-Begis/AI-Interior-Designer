import type { Dispatch, RefObject, SetStateAction } from "react";
import { GenerationCanvasCard } from "./generation-canvas-card";
import type { useWorkspaceGenerationActions } from "../model/workspace-generation-actions";
import type { WorkspaceGeneration } from "../model/workspace-types";
import { generationCanvasActionErrorPresentation } from "@/features/generate-design";
import type {
  VisualPromptEditorHandle,
  VisualPromptTool,
} from "@/features/visual-prompt";

export type WorkspaceGenerationInstance = {
  generation: WorkspaceGeneration;
  variantNumber: string;
  nodeId: string;
};

type WorkspaceGenerationActions = ReturnType<
  typeof useWorkspaceGenerationActions
>;

type WorkspaceGenerationNodeProps = {
  item: WorkspaceGenerationInstance;
  selectedItemId: string;
  editorRef: RefObject<VisualPromptEditorHandle | null>;
  tool: VisualPromptTool;
  color: string;
  strokeWidth: number;
  actions: Pick<
    WorkspaceGenerationActions,
    "cancelGeneration" | "retryGeneration" | "retryAttempts"
  >;
  onHistoryStateChange: Dispatch<
    SetStateAction<{ canUndo: boolean; canRedo: boolean }>
  >;
  onEditorError: Dispatch<SetStateAction<string | null>>;
  onOpenResult(generationId: string, resultUrl: string): void;
};

export function WorkspaceGenerationNode({
  item,
  selectedItemId,
  editorRef,
  tool,
  color,
  strokeWidth,
  actions,
  onHistoryStateChange,
  onEditorError,
  onOpenResult,
}: WorkspaceGenerationNodeProps) {
  const { cancelGeneration, retryGeneration, retryAttempts } = actions;
  const { generation, variantNumber, nodeId } = item;
  const cancelPending =
    cancelGeneration.isPending && cancelGeneration.variables === generation.id;
  const retryPending =
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

  return (
    <GenerationCanvasCard
      generation={generation}
      variantNumber={variantNumber}
      selected={selectedItemId === nodeId}
      editorRef={editorRef}
      tool={tool}
      color={color}
      strokeWidth={strokeWidth}
      onHistoryStateChange={onHistoryStateChange}
      onEditorError={onEditorError}
      cancelPending={cancelPending}
      retryPending={retryPending}
      actionError={actionError}
      onCancel={() => cancelGeneration.mutate(generation.id)}
      onRetry={() => retryGeneration.mutate(retryAttempts.begin(generation))}
      onOpenResult={(resultUrl) => onOpenResult(generation.id, resultUrl)}
    />
  );
}
