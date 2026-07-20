import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VisualPromptEditor } from "@/components/design/visual-prompt-editor";
import { ReferenceManager } from "@/components/design/reference-manager";
import { findOwnedProject } from "@/features/projects/service";
import type { VisualPromptCanvasState } from "@/features/visual-prompt/types";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ProjectDesignPage({ params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }

  const { id } = await params;
  const project = await findOwnedProject(user.id, id);
  if (!project) notFound();
  if (!project.sourceImage || !project.sourcePreview) redirect("/app/design");

  const signed = await getSupabaseAdmin().storage
    .from(project.sourcePreview.bucket)
    .createSignedUrl(project.sourcePreview.path, 600);
  if (signed.error || !signed.data.signedUrl) throw new Error("Не удалось открыть изображение проекта");

  const referenceUrls = await Promise.all(project.references.map(async (reference) => {
    const result = await getSupabaseAdmin().storage.from(reference.file.bucket).createSignedUrl(reference.file.path, 600);
    if (result.error || !result.data.signedUrl) throw new Error("Не удалось открыть референс проекта");
    return {
      id: reference.id,
      fileId: reference.fileId,
      position: reference.position,
      sourceUrl: reference.sourceUrl,
      previewUrl: result.data.signedUrl,
    };
  }));

  return (
    <main className="min-h-screen bg-background p-3 text-foreground sm:p-5">
      <div className="mx-auto max-w-[1600px] rounded-[var(--radius-lg)] border border-border bg-surface p-4 sm:p-7">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <Link href="/app" className="text-sm text-muted hover:text-foreground">← Рабочая область</Link>
            <h1 className="mt-2 text-3xl font-black italic sm:text-4xl">{project.name}</h1>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-accent px-4 py-2 font-bold text-accent-foreground">1 Фото</span>
            <span className="rounded-full bg-surface-elevated px-4 py-2 text-muted">2 Референсы</span>
            <span className="rounded-full bg-surface-elevated px-4 py-2 text-muted">3 Инструкция</span>
          </div>
        </header>

        <div className="mt-6">
          <VisualPromptEditor
            projectId={project.id}
            imageUrl={signed.data.signedUrl}
            editorWidth={project.sourcePreview.width ?? project.sourceImage.width ?? 1600}
            editorHeight={project.sourcePreview.height ?? project.sourceImage.height ?? 900}
            sourceWidth={project.sourceImage.width ?? project.sourcePreview.width ?? 1600}
            sourceHeight={project.sourceImage.height ?? project.sourcePreview.height ?? 900}
            initialState={(project.canvasState as VisualPromptCanvasState | null) ?? null}
          />
          <ReferenceManager projectId={project.id} initialReferences={referenceUrls} />
        </div>
      </div>
    </main>
  );
}
