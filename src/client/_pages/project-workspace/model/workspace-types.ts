import type {
  ProjectWorkspaceDto,
  ProjectWorkspaceGenerationDto,
  ProjectWorkspaceGenerationListDto,
  ProjectWorkspaceReferenceDto,
} from "@/shared/api/projects";

export type WorkspaceGenerationStatus = ProjectWorkspaceGenerationDto["status"];
export type WorkspaceGeneration = ProjectWorkspaceGenerationDto;
export type WorkspaceGenerationList = ProjectWorkspaceGenerationListDto;
export type WorkspaceReference = ProjectWorkspaceReferenceDto;
export type DesignWorkspaceProps = ProjectWorkspaceDto;
