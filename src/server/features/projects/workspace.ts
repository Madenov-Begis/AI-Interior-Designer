import "server-only";

import type { DesignWorkspaceProps } from "@/server/features/projects/workspace-types";
import { GENERATION_CREDIT_COST } from "@/server/shared/config/product";
import { getCreditWallet } from "@/server/features/credits/service";
import { attachHistoryResultUrls } from "@/server/features/generations/history-media";
import { listOwnedGenerations } from "@/server/features/generations/service";
import { findOwnedProject } from "@/server/features/projects/service";
import type { VisualPromptCanvasState } from "@/server/features/visual-prompt/types";
import type { CurrentUser } from "@/server/features/auth/claims";
import { getSupabaseAdmin } from "@/server/shared/integrations/supabase/admin";

export class ProjectWorkspaceNotFoundError extends Error {}

async function signFile(bucket: string, path: string) {
  const result = await getSupabaseAdmin()
    .storage.from(bucket)
    .createSignedUrl(path, 600);
  if (result.error || !result.data.signedUrl) {
    throw new Error("SIGNED_URL_FAILED");
  }
  return result.data.signedUrl;
}

export async function getProjectWorkspace(
  user: CurrentUser,
  projectId: string,
): Promise<DesignWorkspaceProps> {
  const project = await findOwnedProject(user.id, projectId);
  if (!project) throw new ProjectWorkspaceNotFoundError("Проект не найден");

  const [wallet, generationPage, sourceUrl, initialReferences] =
    await Promise.all([
      getCreditWallet(user.id, 0),
      listOwnedGenerations(user.id, { projectId, limit: 20 }),
      project.sourceImage && project.sourcePreview
        ? signFile(project.sourcePreview.bucket, project.sourcePreview.path)
        : Promise.resolve(null),
      Promise.all(
        project.references.map(async (reference) => ({
          id: reference.id,
          fileId: reference.fileId,
          position: reference.position,
          sourceUrl: reference.sourceUrl,
          previewUrl: await signFile(
            reference.file.bucket,
            reference.file.path,
          ),
        })),
      ),
    ]);

  const generationsWithUrls = await attachHistoryResultUrls(
    generationPage.items,
    async (bucket, paths) => {
      const result = await getSupabaseAdmin()
        .storage.from(bucket)
        .createSignedUrls(paths, 600);
      if (result.error) return [];
      return result.data.flatMap((file) =>
        file.path && file.signedUrl
          ? [{ path: file.path, signedUrl: file.signedUrl }]
          : [],
      );
    },
  );

  const source =
    sourceUrl && project.sourceImage && project.sourcePreview
      ? {
          url: sourceUrl,
          width: project.sourcePreview.width ?? 1600,
          height: project.sourcePreview.height ?? 900,
          sourceWidth:
            project.sourceImage.width ?? project.sourcePreview.width ?? 1600,
          sourceHeight:
            project.sourceImage.height ?? project.sourcePreview.height ?? 900,
          initialCanvasState:
            (project.canvasState as VisualPromptCanvasState | null) ?? null,
        }
      : null;
  const name =
    (typeof user.user_metadata.full_name === "string" &&
      user.user_metadata.full_name) ||
    user.email?.split("@")[0] ||
    "Пользователь";

  return {
    user: {
      name,
      email: user.email ?? "",
      avatarUrl:
        typeof user.user_metadata.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : null,
    },
    creditBalance: wallet.balance,
    initialWallet: {
      balance: wallet.balance,
      generationCost: GENERATION_CREDIT_COST,
    },
    project: {
      id: project.id,
      name: project.name,
      prompt: project.prompt,
      aspectRatio: project.aspectRatio,
      source,
    },
    initialReferences,
    initialGenerations: {
      items: generationsWithUrls.map((generation) => ({
        id: generation.id,
        parentGenerationId: generation.parentGenerationId,
        status: generation.status,
        prompt: generation.prompt,
        aspectRatio: generation.aspectRatio,
        resultUserId: generation.resultUserId,
        resultUrl: generation.resultUrl,
        resultUser: generation.resultUser
          ? {
              width: generation.resultUser.width,
              height: generation.resultUser.height,
            }
          : null,
        references: generation.references,
        errorCode: generation.errorCode,
        errorMessage: generation.errorMessage,
        createdAt: generation.createdAt.toISOString(),
        completedAt: generation.completedAt?.toISOString() ?? null,
      })),
      nextCursor: generationPage.nextCursor,
      total: generationPage.total,
    },
  };
}
