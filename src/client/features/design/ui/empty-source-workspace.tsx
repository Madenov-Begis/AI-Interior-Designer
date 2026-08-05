"use client";

import { SourceUpload } from "@/client/features/design/ui/source-upload";
import { RenoaAppHeader } from "@/client/widgets/app-header/app-header";

type EmptySourceWorkspaceProps = {
  projectId: string;
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  creditBalance: number;
};

export function EmptySourceWorkspace({
  projectId,
  user,
  creditBalance,
}: EmptySourceWorkspaceProps) {
  return (
    <div className="canvas-workspace flex h-full min-h-0 flex-col">
      <RenoaAppHeader
        user={user}
        creditBalance={creditBalance}
      />
      <section
        className="min-h-0 flex-1 overflow-hidden bg-background"
        aria-label="Загрузка фотографии помещения"
      >
        <SourceUpload projectId={projectId} />
      </section>
    </div>
  );
}
