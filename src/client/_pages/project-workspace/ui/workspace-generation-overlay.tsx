import { GenerationContextOverlay } from "./generation-context-overlay";
import { GenerationRefinementComposer } from "./generation-refinement-composer";
import type { WorkspaceGenerationInstance } from "./workspace-generation-nodes";
import type { useWorkspaceGenerationActions } from "../model/workspace-generation-actions";
import {
  ApiResponseError,
  type GenerationWallet,
} from "@/features/generate-design";

type WorkspaceGenerationActions = ReturnType<
  typeof useWorkspaceGenerationActions
>;

type WorkspaceGenerationOverlayProps = {
  selected: WorkspaceGenerationInstance | undefined;
  editorOpen: boolean;
  projectId: string;
  wallet: GenerationWallet | null | undefined;
  refinement: Pick<
    WorkspaceGenerationActions,
    "createRefinement" | "submitRefinement"
  >;
  onToggleEditor(): void;
  onCloseEditor(): void;
  onSubmitSuccess(): void;
  onDismiss(): void;
  onRemove(): void;
};

export function WorkspaceGenerationOverlay({
  selected,
  editorOpen,
  projectId,
  wallet,
  refinement,
  onToggleEditor,
  onCloseEditor,
  onSubmitSuccess,
  onDismiss,
  onRemove,
}: WorkspaceGenerationOverlayProps) {
  const generation = selected?.generation;
  if (
    !generation ||
    generation.status !== "SUCCEEDED" ||
    !generation.resultUserId
  ) {
    return null;
  }

  const { createRefinement, submitRefinement } = refinement;
  const mutationIsCurrent =
    createRefinement.variables?.generationId === generation.id;
  const refinementError =
    createRefinement.isError && mutationIsCurrent
      ? createRefinement.error
      : null;

  return (
    <GenerationContextOverlay
      editorOpen={editorOpen}
      onToggleEditor={onToggleEditor}
      onDismiss={onDismiss}
      onRemove={onRemove}
      composer={
        <GenerationRefinementComposer
          generationId={generation.id}
          userScope={projectId}
          balance={wallet?.balance}
          generationCost={wallet?.generationCost}
          pending={createRefinement.isPending && mutationIsCurrent}
          error={refinementError?.message ?? null}
          errorCode={
            refinementError instanceof ApiResponseError
              ? refinementError.code
              : null
          }
          onClose={onCloseEditor}
          onSubmit={async (input) => {
            await submitRefinement(generation.id, input);
            onSubmitSuccess();
          }}
        />
      }
    />
  );
}
