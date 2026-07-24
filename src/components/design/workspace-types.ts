import type { VisualPromptCanvasState } from "@/features/visual-prompt/types";

export type WorkspaceGenerationStatus =
  | "QUEUED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REJECTED";

export type WorkspaceGeneration = {
  id: string;
  status: WorkspaceGenerationStatus;
  prompt: string;
  aspectRatio: string;
  resultUserId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  model: { code: string; name: string };
};

export type WorkspaceReference = {
  id: string;
  fileId: string;
  position: number;
  sourceUrl: string | null;
  previewUrl: string;
};

export type DesignWorkspaceProps = {
  project: {
    id: string;
    name: string;
    prompt: string | null;
    aspectRatio: string;
    sourceUrl: string;
    sourceWidth: number;
    sourceHeight: number;
    initialCanvasState: VisualPromptCanvasState | null;
  };
  initialReferences: WorkspaceReference[];
};
