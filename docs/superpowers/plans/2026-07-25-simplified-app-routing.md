# Simplified App Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send users directly from login into one `/app/[id]` editor where an empty project accepts the source photo and a ready project exposes the full generation workspace.

**Architecture:** `/app` becomes an authenticated server redirect backed by a Prisma service that reuses the newest empty draft or creates one. The canonical project page moves to `/app/[id]`, accepts projects with or without source media, and delegates the empty-source state to a focused workspace component. Legacy `/app/design` routes remain as redirects only.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Prisma 7, Supabase Auth and private Storage, TanStack Query 5, Fabric.js 7, agent-browser.

## Global Constraints

- `/app` must never render a dashboard; it only authenticates, selects an entry project, and redirects.
- `/app/[id]` is the only canonical project workspace URL.
- `/app/history`, `/app/profile`, and `/admin` remain static routes.
- Reuse the newest empty `DRAFT` before creating another empty project.
- Business data remains Prisma-only; Supabase remains limited to Auth and Storage.
- The source upload must use the current project ID and must not create a second project.
- Existing ready-project canvas, annotation, reference, generation, and result behavior must remain unchanged.
- Legacy `/app/design` URLs must redirect rather than return 404.
- Do not add a new automated test harness or automated test files; the approved spec requires static checks, production build, and agent-browser verification.

---

### Task 1: Replace the dashboard with an entry-project redirect

**Files:**
- Modify: `src/features/projects/service.ts`
- Replace: `src/app/app/page.tsx`

**Interfaces:**
- Produces: `getOrCreateEntryProject(userId: string): Promise<{ id: string }>`
- Consumes: existing `requireCurrentUser()` and `upsertProfileFromAuthUser()`

- [ ] **Step 1: Capture the current behavior**

Run:

```bash
agent-browser open http://localhost:3000/app
agent-browser get url
agent-browser snapshot -i
agent-browser close
```

Expected with an authenticated profile: the current dashboard renders instead
of immediately navigating to `/app/<uuid>`. This is the behavior being
replaced. If the isolated browser has no Google session, record the `/login`
redirect and continue with the server-side checks below.

- [ ] **Step 2: Add the owner-scoped entry-project service**

Append to `src/features/projects/service.ts`:

```ts
export async function getOrCreateEntryProject(userId: string) {
  const existing = await getDb().project.findFirst({
    where: {
      userId,
      status: "DRAFT",
      deletedAt: null,
      sourceImageId: null,
      sourcePreviewId: null,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });

  if (existing) return existing;

  return getDb().project.create({
    data: { userId, name: "Новый интерьер" },
    select: { id: true },
  });
}
```

The query must include `userId` and `deletedAt: null`; never accept a
client-supplied owner.

- [ ] **Step 3: Replace `/app` UI with an authenticated redirect**

Replace `src/app/app/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { getOrCreateEntryProject } from "@/features/projects/service";
import {
  requireCurrentUser,
  UnauthorizedError,
  upsertProfileFromAuthUser,
} from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function AppEntryPage() {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }

  await upsertProfileFromAuthUser(user);
  const project = await getOrCreateEntryProject(user.id);
  redirect(`/app/${project.id}`);
}
```

- [ ] **Step 4: Verify the redirect layer**

Run:

```bash
pnpm typecheck
pnpm lint
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/projects/service.ts src/app/app/page.tsx
git commit -m "refactor: enter app through an empty draft"
```

---

### Task 2: Make `/app/[id]` canonical and preserve old links

**Files:**
- Create: `src/app/app/[id]/page.tsx`
- Replace: `src/app/app/design/page.tsx`
- Replace: `src/app/app/design/[id]/page.tsx`

**Interfaces:**
- Consumes: `findOwnedProject(userId, id)`
- Produces: canonical project page at `/app/[id]`
- Produces: compatibility redirects from `/app/design` and `/app/design/[id]`

- [ ] **Step 1: Create the canonical page from the existing project loader**

Create `src/app/app/[id]/page.tsx`. Keep authentication, ownership lookup,
reference signed URLs, and the `DesignWorkspace` render from the old
`src/app/app/design/[id]/page.tsx`, but make source media optional:

```tsx
const source =
  project.sourceImage && project.sourcePreview
    ? await getSupabaseAdmin().storage
        .from(project.sourcePreview.bucket)
        .createSignedUrl(project.sourcePreview.path, 600)
    : null;

if (source?.error || (source && !source.data.signedUrl)) {
  throw new Error("Не удалось открыть изображение проекта");
}
```

Pass one explicit nullable source object:

```tsx
<DesignWorkspace
  project={{
    id: project.id,
    name: project.name,
    prompt: project.prompt,
    aspectRatio: project.aspectRatio,
    source: source
      ? {
          url: source.data.signedUrl,
          width:
            project.sourceImage?.width ??
            project.sourcePreview?.width ??
            1600,
          height:
            project.sourceImage?.height ??
            project.sourcePreview?.height ??
            900,
          initialCanvasState:
            (project.canvasState as VisualPromptCanvasState | null) ?? null,
        }
      : null,
  }}
  initialReferences={referenceUrls}
/>
```

Unknown and non-owned IDs continue to call `notFound()`. Do not redirect an
empty owned project away from this page.

- [ ] **Step 2: Convert `/app/design` into a compatibility redirect**

Replace `src/app/app/design/page.tsx` with:

```tsx
import { permanentRedirect } from "next/navigation";

export default function LegacyDesignEntryPage() {
  permanentRedirect("/app");
}
```

- [ ] **Step 3: Convert `/app/design/[id]` into a compatibility redirect**

Replace `src/app/app/design/[id]/page.tsx` with:

```tsx
import { permanentRedirect } from "next/navigation";

export default async function LegacyProjectDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/app/${id}`);
}
```

- [ ] **Step 4: Verify route compilation and precedence**

Run:

```bash
node -e "const {getSortedRoutes}=require('next/dist/shared/lib/router/utils/sorted-routes'); console.log(getSortedRoutes(['/app/[id]','/app/history','/app/profile','/app']))"
pnpm typecheck
pnpm lint
```

Expected route order:

```text
[ '/app', '/app/history', '/app/profile', '/app/[id]' ]
```

Expected checks: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/app
git commit -m "refactor: move project workspace to app id route"
```

---

### Task 3: Render source upload inside the unified workspace

**Files:**
- Modify: `src/components/design/workspace-types.ts`
- Modify: `src/components/design/source-upload.tsx`
- Create: `src/components/design/empty-source-workspace.tsx`
- Modify: `src/components/design/design-workspace.tsx`

**Interfaces:**
- Changes: `DesignWorkspaceProps["project"]["source"]` is a nullable object
- Changes: `SourceUpload({ projectId, initialProjectName })`
- Produces: `EmptySourceWorkspace({ projectId, projectName })`
- Consumes: `POST /api/v1/projects/[id]/source`

- [ ] **Step 1: Change the serializable project contract**

In `src/components/design/workspace-types.ts`, replace the four required source
fields with:

```ts
source: {
  url: string;
  width: number;
  height: number;
  initialCanvasState: VisualPromptCanvasState | null;
} | null;
```

- [ ] **Step 2: Make `SourceUpload` upload into an existing project**

Change its public signature:

```tsx
type SourceUploadProps = {
  projectId: string;
  initialProjectName: string;
};

export function SourceUpload({
  projectId,
  initialProjectName,
}: SourceUploadProps) {
```

Remove the `POST /api/v1/projects` request. Upload directly:

```tsx
const formData = new FormData();
formData.set("file", file);
const uploadResponse = await fetch(`/api/v1/projects/${projectId}/source`, {
  method: "POST",
  body: formData,
});
const uploadPayload = await uploadResponse.json();
if (!uploadResponse.ok) {
  throw new Error(
    uploadPayload.error?.message ?? "Не удалось загрузить фотографию",
  );
}
```

If `initialProjectName === "Новый интерьер"`, derive a trimmed name from the
filename and make a best-effort PATCH without turning a successful source
upload into an error:

```tsx
const derivedName =
  file.name.replace(/\.[^.]+$/, "").trim().slice(0, 120) || "Новый интерьер";

if (initialProjectName === "Новый интерьер" && derivedName !== initialProjectName) {
  await fetch(`/api/v1/projects/${projectId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: derivedName }),
  }).catch(() => undefined);
}
```

On success, remain on the same URL:

```tsx
setState("success");
setMessage("Фотография проверена и сохранена.");
router.refresh();
```

Restyle the component as the large source card for the canvas area; remove the
old step counter and separate right-hand instruction panel because the unified
workspace already owns its inspector column. Use `Сохранить фото` as the idle
submit-button label, `Обрабатываем…` while uploading, and `Фото сохранено ✓`
after success.

- [ ] **Step 3: Add the empty-source workspace shell**

Create `src/components/design/empty-source-workspace.tsx` with:

```tsx
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
          className="grid min-h-0 place-items-center overflow-auto bg-background p-4 sm:p-8"
          aria-label="Загрузка фотографии помещения"
        >
          <SourceUpload
            projectId={projectId}
            initialProjectName={projectName}
          />
        </section>
        <aside className="hidden border-l border-border bg-surface p-6 min-[1200px]:block">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">
            AI-настройки
          </p>
          <h2 className="mt-3 text-2xl font-black italic">
            Начните с фотографии
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            После загрузки здесь появятся референсы, инструкция, стиль,
            модель и кнопка генерации.
          </p>
          <div className="mt-6 rounded-xl border border-border bg-background p-4 text-sm text-muted">
            Сначала загрузите фотографию помещения.
          </div>
        </aside>
      </div>
    </div>
  );
}
```

On mobile the upload card itself contains the file requirements and status, so
the hidden desktop aside does not remove essential information.

- [ ] **Step 4: Split empty and ready states without conditional hooks**

In `src/components/design/design-workspace.tsx`, keep the exported wrapper
small:

```tsx
export function DesignWorkspace(props: DesignWorkspaceProps) {
  if (!props.project.source) {
    return (
      <EmptySourceWorkspace
        projectId={props.project.id}
        projectName={props.project.name}
      />
    );
  }

  return <ReadyDesignWorkspace {...props} />;
}
```

Rename the current hook-heavy implementation to the internal
`ReadyDesignWorkspace`. Inside it, bind:

```ts
const source = project.source;
```

and replace source accesses:

```tsx
source={{
  projectId: project.id,
  imageUrl: source.url,
  width: source.width,
  height: source.height,
  initialState: source.initialCanvasState,
}}
```

Use `source.url` for `ResultActions`. The wrapper must branch before the ready
component mounts so React hook order remains stable.

- [ ] **Step 5: Verify both TypeScript branches**

Run:

```bash
pnpm typecheck
pnpm lint
git diff --check
```

Expected: all commands exit 0; there are no remaining references to
`project.sourceUrl`, `project.sourceWidth`, `project.sourceHeight`, or
`project.initialCanvasState`.

- [ ] **Step 6: Commit**

```bash
git add src/components/design src/app/app/[id]/page.tsx
git commit -m "feat: upload source inside project workspace"
```

---

### Task 4: Update navigation to the simplified route map

**Files:**
- Modify: `src/components/design/workspace-header.tsx`
- Modify: `src/components/history/history-grid.tsx`
- Modify: `src/app/app/history/page.tsx`
- Modify: `src/app/app/profile/page.tsx`
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Produces: all workspace links use `/app` or `/app/[id]`
- Removes: user-facing links to `/app/design` and `/app/design/[id]`

- [ ] **Step 1: Update the workspace header**

Replace the old `Проекты` link with:

```tsx
<Link
  href="/app"
  className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
>
  <span aria-hidden="true">＋</span>
  <span className="hidden sm:inline">Новый дизайн</span>
</Link>
```

Keep `История` at `/app/history` and `Профиль` at `/app/profile`.

- [ ] **Step 2: Update history project links**

In `src/components/history/history-grid.tsx`, replace:

```tsx
href={`/app/design/${item.projectId}`}
```

with:

```tsx
href={`/app/${item.projectId}`}
```

The empty-history action continues to use `/app`, not `/app/design`.

- [ ] **Step 3: Update page-level navigation**

Apply these exact destination changes:

```text
history: “← В редактор” → /app
history: “＋ Новый дизайн” → /app
profile: “← В редактор” → /app
admin forbidden redirect → /app
admin: “← В приложение” → /app
```

Only labels need changing where they currently imply a removed dashboard.

- [ ] **Step 4: Prove no user-facing legacy links remain**

Run:

```bash
rg -n 'href=.*app/design|router\.(push|replace)\(.*/app/design|redirect\(.*/app/design' src -g '*.ts' -g '*.tsx'
```

Expected: only the two legacy redirect route files mention `/app/design`;
components and canonical pages do not link there.

- [ ] **Step 5: Run focused checks**

```bash
pnpm typecheck
pnpm lint
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/design/workspace-header.tsx src/components/history/history-grid.tsx src/app/app/history/page.tsx src/app/app/profile/page.tsx src/app/admin/page.tsx
git commit -m "refactor: simplify application navigation"
```

---

### Task 5: Verify the complete login-to-generation flow

**Files:**
- Modify only if verification uncovers a scoped defect in files from Tasks 1–4.

**Interfaces:**
- Verifies: canonical routing, empty upload state, ready canvas, static route precedence, and legacy redirects.

- [ ] **Step 1: Run all repository checks**

```bash
pnpm prisma:validate
pnpm typecheck
pnpm lint
pnpm build
```

Expected: every command exits 0.

- [ ] **Step 2: Start the production-equivalent development server**

```bash
pnpm dev
```

Expected: Next.js reports the local URL and no startup error. Reuse an existing
healthy dev server instead of starting a second copy on another port.

- [ ] **Step 3: Verify public and unauthenticated route behavior**

```bash
agent-browser open http://localhost:3000/
agent-browser wait --load networkidle
agent-browser eval 'document.querySelector("[data-nextjs-dialog]") ? "ERROR_OVERLAY" : "OK"'
agent-browser open http://localhost:3000/app
agent-browser get url
agent-browser close
```

Expected: the landing page has no error overlay; an unauthenticated `/app`
session lands on `/login`.

- [ ] **Step 4: Verify authenticated route behavior**

Using an authenticated Chrome profile or an interactive Google login:

```bash
agent-browser --profile Default open http://localhost:3000/app
agent-browser wait --load networkidle
agent-browser get url
agent-browser snapshot -i
```

Expected:

- URL matches `/app/<uuid>`;
- an empty project shows the source upload control;
- `/app/history` renders `История генераций`;
- `/app/profile` renders the profile;
- `/app/design` ends at `/app/<uuid>`;
- `/app/design/<known-project-id>` ends at `/app/<known-project-id>`;
- no Next.js error overlay or browser page errors appear.

- [ ] **Step 5: Verify source upload on the same URL**

Use a valid JPG, PNG, or WEBP test room image:

```bash
agent-browser snapshot -i
agent-browser upload 'input[type="file"]' /absolute/path/to/test-room.jpg
agent-browser find role button click --name "Сохранить фото"
agent-browser wait --load networkidle
agent-browser get url
agent-browser snapshot -i
agent-browser errors
```

Expected: the URL remains `/app/<same-uuid>` and the canvas, annotation
toolbar, AI inspector, and generation action replace the upload state.

- [ ] **Step 6: Inspect final repository state**

```bash
git status -sb
git log --oneline -6
git diff --check
```

Expected: clean worktree, intentional task commits only, no whitespace errors.

- [ ] **Step 7: Push the verified branch**

```bash
git push origin master
```

Expected: remote `master` advances to the verified local HEAD.
