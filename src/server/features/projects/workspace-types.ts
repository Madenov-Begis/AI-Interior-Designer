import type { VisualPromptCanvasState } from "@/server/features/visual-prompt/types";

export type WorkspaceGenerationStatus =
  "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REJECTED";

export type WorkspaceGeneration = {
  id: string;
  parentGenerationId: string | null;
  status: WorkspaceGenerationStatus;
  prompt: string;
  aspectRatio: string;
  resultUserId: string | null;
  resultUrl: string | null;
  resultUser: { width: number | null; height: number | null } | null;
  references: Array<{ fileId: string; position: number }>;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type WorkspaceGenerationList = {
  items: WorkspaceGeneration[];
  nextCursor: string | null;
  total: number;
};

export type WorkspaceWallet = {
  balance: number;
  generationCost: number;
};

export type WorkspaceReference = {
  id: string;
  fileId: string;
  position: number;
  sourceUrl: string | null;
  previewUrl: string;
};

export type DesignWorkspaceProps = {
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  creditBalance: number;
  initialWallet: WorkspaceWallet;
  initialGenerations: WorkspaceGenerationList;
  project: {
    id: string;
    name: string;
    prompt: string | null;
    aspectRatio: string;
    source: {
      url: string;
      width: number;
      height: number;
      sourceWidth: number;
      sourceHeight: number;
      initialCanvasState: VisualPromptCanvasState | null;
    } | null;
  };
  initialReferences: WorkspaceReference[];
};
