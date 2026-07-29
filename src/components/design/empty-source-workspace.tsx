"use client";

import { SourceUpload } from "@/components/design/source-upload";
import { WorkspaceHeader } from "@/components/design/workspace-header";

type EmptySourceWorkspaceProps = {
  projectId: string;
  projectName: string;
};

export function EmptySourceWorkspace({
  projectId,
  projectName,
}: EmptySourceWorkspaceProps) {
  return (
    <div className="canvas-workspace flex h-full min-h-0 flex-col">
      <WorkspaceHeader
        projectId={projectId}
        initialName={projectName}
        canUndo={false}
        canRedo={false}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />
      <div className="grid min-h-0 flex-1 min-[1200px]:grid-cols-[minmax(0,1fr)_380px]">
        <section
          className="min-h-0 overflow-hidden bg-background"
          aria-label="Загрузка фотографии помещения"
        >
          <SourceUpload
            projectId={projectId}
            initialProjectName={projectName}
          />
        </section>
        <aside className="hidden border-l border-border bg-card p-6 min-[1200px]:block">
          <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
            Новый интерьер
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Начните с фотографии
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Загрузите комнату прямо на холст. Затем здесь появятся только
            стиль, формат и описание изменений.
          </p>
          <div className="mt-6 rounded-lg border border-primary/20 bg-primary/7 p-4 text-xs leading-5 text-muted-foreground">
            Одна генерация стоит 4 кредита. При технической ошибке кредиты
            автоматически возвращаются.
          </div>
        </aside>
      </div>
    </div>
  );
}
