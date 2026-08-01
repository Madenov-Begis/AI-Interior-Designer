import { notFound, redirect } from "next/navigation";
import { DesignWorkspace } from "@/components/design/design-workspace";
import { getCreditWallet } from "@/features/credits/service";
import { findOwnedProject } from "@/features/projects/service";
import type { VisualPromptCanvasState } from "@/features/visual-prompt/types";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  const wallet = await getCreditWallet(user.id, 0);
  const userName =
    (typeof user.user_metadata.full_name === "string" &&
      user.user_metadata.full_name) ||
    user.email?.split("@")[0] ||
    "Пользователь";

  let sourceUrl: string | null = null;
  if (project.sourceImage && project.sourcePreview) {
    const signed = await getSupabaseAdmin()
      .storage.from(project.sourcePreview.bucket)
      .createSignedUrl(project.sourcePreview.path, 600);
    if (signed.error || !signed.data.signedUrl) {
      throw new Error("Не удалось открыть изображение проекта");
    }
    sourceUrl = signed.data.signedUrl;
  }

  const referenceUrls = await Promise.all(
    project.references.map(async (reference) => {
      const result = await getSupabaseAdmin()
        .storage.from(reference.file.bucket)
        .createSignedUrl(reference.file.path, 600);
      if (result.error || !result.data.signedUrl) {
        throw new Error("Не удалось открыть референс проекта");
      }
      return {
        id: reference.id,
        fileId: reference.fileId,
        position: reference.position,
        sourceUrl: reference.sourceUrl,
        previewUrl: result.data.signedUrl,
      };
    }),
  );

  const source =
    sourceUrl && project.sourceImage && project.sourcePreview
      ? {
          url: sourceUrl,
          width:
            project.sourceImage.width ?? project.sourcePreview.width ?? 1600,
          height:
            project.sourceImage.height ?? project.sourcePreview.height ?? 900,
          initialCanvasState:
            (project.canvasState as VisualPromptCanvasState | null) ?? null,
        }
      : null;

  return (
    <main className="h-dvh overflow-hidden bg-background text-foreground">
      <DesignWorkspace
        user={{
          name: userName,
          email: user.email ?? "",
          avatarUrl:
            typeof user.user_metadata.avatar_url === "string"
              ? user.user_metadata.avatar_url
              : null,
        }}
        creditBalance={wallet.balance}
        project={{
          id: project.id,
          name: project.name,
          prompt: project.prompt,
          aspectRatio: project.aspectRatio,
          source,
        }}
        initialReferences={referenceUrls}
      />
    </main>
  );
}
