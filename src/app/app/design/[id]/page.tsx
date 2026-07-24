import { notFound, redirect } from "next/navigation";
import { DesignWorkspace } from "@/components/design/design-workspace";
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
    <main className="h-dvh overflow-hidden bg-background text-foreground">
      <DesignWorkspace
        project={{
          id: project.id,
          name: project.name,
          prompt: project.prompt,
          aspectRatio: project.aspectRatio,
          sourceUrl: signed.data.signedUrl,
          sourceWidth: project.sourceImage.width ?? project.sourcePreview.width ?? 1600,
          sourceHeight: project.sourceImage.height ?? project.sourcePreview.height ?? 900,
          initialCanvasState: (project.canvasState as VisualPromptCanvasState | null) ?? null,
        }}
        initialReferences={referenceUrls}
      />
    </main>
  );
}
