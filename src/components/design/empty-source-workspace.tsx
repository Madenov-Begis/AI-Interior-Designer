"use client";

import { SourceUpload } from "@/components/design/source-upload";
import { WorkspaceHeader } from "@/components/design/workspace-header";

type EmptySourceWorkspaceProps = {
  projectId: string;
  projectName: string;
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  creditBalance: number;
};

export function EmptySourceWorkspace({
  projectId,
  projectName,
  user,
  creditBalance,
}: EmptySourceWorkspaceProps) {
  return (
    <div className="canvas-workspace flex h-full min-h-0 flex-col">
      <WorkspaceHeader
        projectId={projectId}
        initialName={projectName}
        user={user}
        creditBalance={creditBalance}
        canUndo={false}
        canRedo={false}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />
      <section
        className="min-h-0 flex-1 overflow-hidden bg-background"
        aria-label="Загрузка фотографии помещения"
      >
        <SourceUpload projectId={projectId} initialProjectName={projectName} />
      </section>
    </div>
  );
}
