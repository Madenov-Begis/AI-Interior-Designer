export type ProjectWorkspaceCanvasStateDto = {
  version: 1;
  coordinateSpace: {
    editorWidth: number;
    editorHeight: number;
    sourceWidth: number;
    sourceHeight: number;
  };
  fabric: Record<string, unknown>;
};

export type ProjectWorkspaceGenerationDto = {
  id: string;
  parentGenerationId: string | null;
  status:
    "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REJECTED";
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

export type ProjectWorkspaceGenerationListDto = {
  items: ProjectWorkspaceGenerationDto[];
  nextCursor: string | null;
  total: number;
};

export type ProjectWorkspaceReferenceDto = {
  id: string;
  fileId: string;
  position: number;
  sourceUrl: string | null;
  previewUrl: string;
};

export type ProjectWorkspaceDto = {
  initialGenerations: ProjectWorkspaceGenerationListDto;
  project: {
    id: string;
    prompt: string | null;
    aspectRatio: string;
    source: {
      url: string;
      width: number;
      height: number;
      sourceWidth: number;
      sourceHeight: number;
      initialCanvasState: ProjectWorkspaceCanvasStateDto | null;
    } | null;
  };
  initialReferences: ProjectWorkspaceReferenceDto[];
};
