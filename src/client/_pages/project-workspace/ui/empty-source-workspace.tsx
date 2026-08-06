"use client";

import { SourceUpload } from "./source-upload";

type EmptySourceWorkspaceProps = {
  projectId: string;
};

export function EmptySourceWorkspace({ projectId }: EmptySourceWorkspaceProps) {
  return (
    <div className="canvas-workspace flex h-full min-h-0 flex-col">
      <section
        className="min-h-0 flex-1 overflow-hidden bg-background"
        aria-label="Загрузка фотографии помещения"
      >
        <SourceUpload projectId={projectId} />
      </section>
    </div>
  );
}
