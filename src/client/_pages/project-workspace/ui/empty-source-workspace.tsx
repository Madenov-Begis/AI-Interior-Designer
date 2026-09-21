"use client";

import { SourceUpload } from "./source-upload";
import { useAppText } from "@/shared/providers";

type EmptySourceWorkspaceProps = {
  projectId: string;
};

export function EmptySourceWorkspace({ projectId }: EmptySourceWorkspaceProps) {
  const t = useAppText();
  return (
    <div className="canvas-workspace flex h-full min-h-0 flex-col">
      <section
        className="min-h-0 flex-1 overflow-hidden bg-background"
        aria-label={t("Загрузка фотографии помещения")}
      >
        <SourceUpload projectId={projectId} />
      </section>
    </div>
  );
}
