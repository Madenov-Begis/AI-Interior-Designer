"use client";

import { SourceUpload } from "./source-upload";
import {
  WorkspaceInspectorPanel,
  WorkspaceInspectorTrigger,
  useWorkspaceInspectorPanel,
} from "./workspace-inspector-panel";
import { INTERIOR_STYLES } from "@/features/generate-design";
import { useAppSession } from "@/features/auth/index.client";
import { useAppText } from "@/shared/providers";
import type { WorkspaceReference } from "../model/workspace-types";
import type { GenerationDraft } from "../model/use-generation-draft";

type EmptySourceWorkspaceProps = {
  projectId: string;
  initialReferences: WorkspaceReference[];
  draft: GenerationDraft;
};

export function EmptySourceWorkspace({
  projectId,
  initialReferences,
  draft,
}: EmptySourceWorkspaceProps) {
  const t = useAppText();
  const { wallet } = useAppSession();
  const inspector = useWorkspaceInspectorPanel();
  return (
    <div className="canvas-workspace relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 min-[1200px]:grid-cols-[minmax(0,1fr)_380px]">
        <section
          className="page-grid relative min-h-0 overflow-hidden bg-background"
          aria-label={t("Холст проекта")}
        >
          <WorkspaceInspectorTrigger
            triggerRef={inspector.triggerRef}
            open={inspector.open}
            onOpen={inspector.show}
          />
          <SourceUpload projectId={projectId} />
        </section>
        <WorkspaceInspectorPanel
          dialogRef={inspector.dialogRef}
          dialogNode={inspector.dialogNode}
          open={inspector.open}
          desktop={inspector.desktop}
          onClose={inspector.close}
          onClosed={inspector.onClosed}
          inspectorProps={{
            projectId,
            initialReferences,
            prompt: draft.prompt,
            onPromptChange: draft.setPrompt,
            rooms: draft.roomsQuery.data?.items ?? [],
            roomTypeId: draft.availableRoomTypeId,
            onRoomTypeChange: draft.setRoomTypeId,
            styles: [...INTERIOR_STYLES],
            styleCode: draft.styleCode,
            onStyleChange: draft.setStyleCode,
            aspectRatio: draft.aspectRatio,
            sourceAspectRatio: "RATIO_16_9",
            onAspectRatioChange: draft.setAspectRatio,
            credits: wallet,
            dataLoading: draft.roomsQuery.isLoading,
            dataError: draft.roomsQuery.error?.message ?? null,
            onDataRetry: () => void draft.roomsQuery.refetch(),
            generationPending: false,
            generationError: null,
            generationErrorCode: null,
            disabledReasons: ["Загрузите фото комнаты"],
            onGenerate: () => {},
          }}
        />
      </div>
    </div>
  );
}
