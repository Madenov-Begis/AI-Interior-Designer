# Canvas Upload and Persistent Auth Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload the room photo immediately inside `/app/[id]` and keep a verified Supabase session active across public and private navigation.

**Architecture:** A focused client upload controller will own request cancellation and stale-result protection while canvas components own presentation. Supabase SSR cookies remain the only token store; a pure route-policy module will drive proxy redirects, while Server Components and Route Handlers continue to verify the JWT independently.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth/SSR, Node.js test runner, Tailwind CSS.

## Global Constraints

- The canonical editor URL remains `/app/[id]`.
- Selecting, dropping, or replacing a source photo starts upload immediately.
- There is no “Save photo” button and no route navigation after upload.
- Access-token JWT expiry is 86,400 seconds.
- Session time-box is 2,592,000 seconds when supported by the Supabase plan.
- Tokens stay in Supabase SSR cookies; application code must not store them in `localStorage`.
- Proxy redirects are defense-in-depth; protected pages and APIs still verify identity on the server.
- OAuth `next` values must be local paths and must reject protocol-relative/external URLs.

---

## File Structure

- Create `src/features/media/source-upload-client.ts`: upload request, response parsing, and abort semantics.
- Create `src/features/media/source-upload-client.test.ts`: request, error, and cancellation regression tests.
- Modify `src/components/design/source-upload.tsx`: automatic selection/drop upload and in-canvas states.
- Modify `src/components/design/empty-source-workspace.tsx`: make the canvas itself the drop target.
- Create `src/components/design/source-replace-control.tsx`: ready-canvas replacement action using the same immediate upload path.
- Modify `src/components/design/design-workspace.tsx`: expose replacement control and refresh source data in place.
- Create `src/lib/auth/route-policy.ts`: pure private-route and safe-return-path decisions.
- Create `src/lib/auth/route-policy.test.ts`: route-policy regression tests.
- Modify `src/lib/supabase/proxy.ts`: refresh cookies for matched requests and apply route policy.
- Modify `src/proxy.ts`: match public application pages and APIs while excluding immutable assets.
- Modify `src/app/page.tsx`: resolve verified auth state and pass it to marketing calls to action.
- Modify `src/components/marketing/site-header.tsx`: render “Continue” for signed-in users.
- Modify `src/components/marketing/hero.tsx`: render the correct signed-in call to action.
- Modify `src/app/login/page.tsx`: redirect a verified existing session to `/app`.
- Modify `src/app/auth/callback/route.ts`: reuse the safe-return-path helper.
- Modify `package.json`: add the Node test script.

---

### Task 1: Add the Upload Request Contract

**Files:**
- Create: `src/features/media/source-upload-client.test.ts`
- Create: `src/features/media/source-upload-client.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `uploadProjectSource(input: { projectId: string; file: File; signal: AbortSignal; fetcher?: typeof fetch }): Promise<unknown>`
- Produces: `sourceProjectName(fileName: string): string`

- [ ] **Step 1: Add a test script and write failing request tests**

Add `"test": "node --test --experimental-strip-types src/**/*.test.ts"` to
`package.json`. Write tests using `node:test` and `node:assert/strict` that:

```ts
test("uploads the selected file immediately to the project source endpoint", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const file = new File(["room"], "living-room.jpg", { type: "image/jpeg" });
  const data = await uploadProjectSource({
    projectId: "project-1",
    file,
    signal: new AbortController().signal,
    fetcher: async (input, init) => {
      calls.push({ input, init });
      return Response.json({ data: { mediaId: "media-1" } });
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.input, "/api/v1/projects/project-1/source");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal(data.mediaId, "media-1");
});

test("surfaces the API error message", async () => {
  await assert.rejects(
    uploadProjectSource({
      projectId: "project-1",
      file: new File(["bad"], "bad.jpg", { type: "image/jpeg" }),
      signal: new AbortController().signal,
      fetcher: async () =>
        Response.json(
          { error: { message: "Изображение слишком маленькое" } },
          { status: 422 },
        ),
    }),
    /Изображение слишком маленькое/,
  );
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test`

Expected: FAIL because `source-upload-client.ts` and its exports do not exist.

- [ ] **Step 3: Implement the minimal upload contract**

Implement `uploadProjectSource` to create `FormData`, append the file, issue one
POST with the provided signal, parse JSON, throw the API message on non-2xx,
and return `payload.data`. Implement `sourceProjectName` by stripping the final
extension, trimming, limiting to 120 characters, and falling back to
`"Новый интерьер"`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm test`

Expected: all upload-contract tests PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json src/features/media/source-upload-client.ts src/features/media/source-upload-client.test.ts
git commit -m "test: define immediate source upload contract"
```

### Task 2: Make the Empty Canvas Upload Immediately

**Files:**
- Modify: `src/features/media/source-upload-client.test.ts`
- Modify: `src/components/design/source-upload.tsx`
- Modify: `src/components/design/empty-source-workspace.tsx`

**Interfaces:**
- Consumes: `uploadProjectSource`, `sourceProjectName`
- Produces: `SourceUpload` with `projectId`, `initialProjectName`, and optional `compact` presentation

- [ ] **Step 1: Add failing stale-request and validation tests**

Extend the upload tests with an `isAcceptedSourceFile(file)` contract:

```ts
assert.equal(
  isAcceptedSourceFile(new File(["x"], "room.jpg", { type: "image/jpeg" })),
  true,
);
assert.equal(
  isAcceptedSourceFile(new File(["x"], "room.gif", { type: "image/gif" })),
  false,
);
```

Add a test that passes an already-aborted signal and expects an `AbortError`
instead of an application error.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test`

Expected: FAIL because `isAcceptedSourceFile` is not exported.

- [ ] **Step 3: Implement automatic upload states**

In `SourceUpload`:

- Remove stored “ready” state and the “Save photo” button.
- On `input` change or drop, validate JPEG/PNG/WEBP and maximum 15 MiB.
- Revoke the previous object URL, render the new object URL immediately, abort
  the previous request, and call `uploadProjectSource` in the same event.
- Track a monotonically increasing request ID. Only the latest request may
  change success/error state or call `router.refresh()`.
- Keep the preview on failure and render “Повторить” and “Выбрать другое”.
- Show a processing overlay while uploading.
- On success, patch the derived project name without blocking refresh.
- Do not call `router.push`.

In `EmptySourceWorkspace`, remove the card-like step presentation so
`SourceUpload` fills the central canvas area.

- [ ] **Step 4: Run focused and static checks**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Expected: all commands PASS and no “Сохранить фото” text remains in the source
upload component.

- [ ] **Step 5: Commit**

```bash
git add src/features/media/source-upload-client.ts src/features/media/source-upload-client.test.ts src/components/design/source-upload.tsx src/components/design/empty-source-workspace.tsx
git commit -m "feat: upload source photos directly on canvas"
```

### Task 3: Add Immediate Source Replacement

**Files:**
- Create: `src/components/design/source-replace-control.tsx`
- Modify: `src/components/design/design-workspace.tsx`

**Interfaces:**
- Consumes: `uploadProjectSource`, `isAcceptedSourceFile`
- Produces: `SourceReplaceControl({ projectId, onUploadingChange? })`

- [ ] **Step 1: Write the replacement behavior expectation**

Add a source-level assertion test that replacement uses the same endpoint and
aborts the previous request when another file is selected before completion.
Use two controlled promises and assert that the first signal becomes aborted
before the second request resolves.

- [ ] **Step 2: Run test and verify RED**

Run: `pnpm test`

Expected: FAIL until the reusable abort-controller helper
`createLatestSourceUpload()` exists.

- [ ] **Step 3: Implement replacement control**

Create `createLatestSourceUpload()` in the upload client module. It owns the
current `AbortController`, aborts it before every new upload, and exposes
`upload(projectId, file, fetcher?)` plus `abort()`.

Create `SourceReplaceControl` with a visually hidden file input and a
“Заменить фото” button. Selection starts upload immediately, shows
“Заменяем…”, refreshes server data on success, and keeps an inline retryable
error on failure. Mount the control near the ready canvas actions in
`DesignWorkspace`.

- [ ] **Step 4: Verify**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/media/source-upload-client.ts src/features/media/source-upload-client.test.ts src/components/design/source-replace-control.tsx src/components/design/design-workspace.tsx
git commit -m "feat: replace source photos without leaving canvas"
```

### Task 4: Define and Test Auth Route Policy

**Files:**
- Create: `src/lib/auth/route-policy.test.ts`
- Create: `src/lib/auth/route-policy.ts`
- Modify: `src/app/auth/callback/route.ts`

**Interfaces:**
- Produces: `isProtectedPath(pathname: string): boolean`
- Produces: `safeReturnPath(value: string | null, fallback?: string): string`

- [ ] **Step 1: Write failing route-policy tests**

Cover these exact expectations:

```ts
assert.equal(isProtectedPath("/app"), true);
assert.equal(isProtectedPath("/app/project-1"), true);
assert.equal(isProtectedPath("/admin/users"), true);
assert.equal(isProtectedPath("/application"), false);
assert.equal(safeReturnPath("/app/project-1"), "/app/project-1");
assert.equal(safeReturnPath("//evil.example"), "/app");
assert.equal(safeReturnPath("https://evil.example"), "/app");
assert.equal(safeReturnPath(null), "/app");
```

- [ ] **Step 2: Run test and verify RED**

Run: `pnpm test`

Expected: FAIL because `route-policy.ts` is missing.

- [ ] **Step 3: Implement pure policy and use it in OAuth callback**

Implement segment-safe equality/prefix matching for `/app` and `/admin`.
Implement `safeReturnPath` with a required single leading slash, no second
leading slash, and no control characters. Replace the callback’s inline
`safeNext` logic with this helper.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/route-policy.ts src/lib/auth/route-policy.test.ts src/app/auth/callback/route.ts
git commit -m "test: define private route auth policy"
```

### Task 5: Refresh Supabase Sessions Across Navigation

**Files:**
- Modify: `src/lib/supabase/proxy.ts`
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: `isProtectedPath`, `safeReturnPath`
- Preserves: `updateSupabaseSession(request: NextRequest): Promise<NextResponse>`

- [ ] **Step 1: Capture current failing behavior**

Run the app with a valid auth cookie, visit `/`, then `/login`, and record that
the current matcher does not invoke session refresh for either path. Confirm
from `src/proxy.ts` that only `/app`, `/admin`, and `/auth` are matched.

- [ ] **Step 2: Implement the official SSR refresh pattern**

In `src/lib/supabase/proxy.ts`, create the server client and call
`auth.getClaims()` immediately. In `setAll`, update request cookies, recreate
the response, copy response cookies with the supplied options, and preserve
Supabase response headers when supplied by the installed `@supabase/ssr`
signature.

Use `isProtectedPath` for anonymous redirects and include both pathname and
query string in a safe local `next` parameter.

In `src/proxy.ts`, match all application/API paths except `_next/static`,
`_next/image`, favicon, and static image/font files.

- [ ] **Step 3: Verify proxy behavior**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Expected: PASS. Anonymous `/app/x` redirects to `/login?next=%2Fapp%2Fx`;
public `/` remains accessible.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/proxy.ts src/proxy.ts
git commit -m "fix: refresh Supabase session across navigation"
```

### Task 6: Make Homepage and Login Auth-Aware

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/marketing/site-header.tsx`
- Modify: `src/components/marketing/hero.tsx`

**Interfaces:**
- `SiteHeader({ authenticated: boolean })`
- `Hero({ authenticated: boolean })`

- [ ] **Step 1: Add server-rendering expectations**

Use the route-policy test file to add a small CTA mapping contract:
`authEntry(true)` returns `{ href: "/app", label: "Продолжить" }` and
`authEntry(false)` returns `{ href: "/login", label: "Войти" }`.

- [ ] **Step 2: Run test and verify RED**

Run: `pnpm test`

Expected: FAIL because `authEntry` is missing.

- [ ] **Step 3: Implement verified auth-aware pages**

Add `authEntry` to the route-policy module. Make the homepage dynamic, call
the server Supabase client’s `getClaims()`, and pass a boolean to `SiteHeader`
and `Hero`. Use `/app` CTA copy for signed-in users.

In `/login`, call `getClaims()` and `redirect("/app")` when verified claims
exist. Anonymous users continue to see Google sign-in.

- [ ] **Step 4: Verify**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/route-policy.ts src/lib/auth/route-policy.test.ts src/app/page.tsx src/app/login/page.tsx src/components/marketing/site-header.tsx src/components/marketing/hero.tsx
git commit -m "feat: keep authenticated users signed in across public pages"
```

### Task 7: Configure and Verify Token Lifetimes

**Files:**
- No repository source file required unless the hosted plan cannot enforce the
  requested session time-box; document any platform limitation in the handoff.

**Interfaces:**
- Supabase Auth config `jwt_exp = 86400`
- Supabase Auth config `sessions_timebox = 2592000`

- [ ] **Step 1: Read current hosted Auth configuration**

Use the authenticated Supabase Management API
`GET /v1/projects/awqmmdcbuhtaqbvxbper/config/auth` and extract only
`jwt_exp`, `sessions_timebox`, `sessions_inactivity_timeout`, and
`sessions_single_per_user`. Do not print or persist the management token.

- [ ] **Step 2: Apply the requested values**

PATCH only:

```json
{
  "jwt_exp": 86400,
  "sessions_timebox": 2592000
}
```

If Supabase rejects `sessions_timebox` because the project is not on Pro,
leave refresh rotation enabled, do not invent a custom token store, and report
the plan requirement that needs a Supabase upgrade.

- [ ] **Step 3: Read back and verify**

GET the same configuration and assert `jwt_exp === 86400` and, when supported,
`sessions_timebox === 2592000`.

### Task 8: Full Verification and Production Deployment

**Files:**
- Modify only files required by failures found during verification.

**Interfaces:**
- Production branch: `master`
- Production URL: `https://ai-interior-designer-liart.vercel.app`

- [ ] **Step 1: Run the complete local suite**

Run:

```bash
pnpm test
pnpm exec prisma validate
pnpm typecheck
pnpm lint
pnpm build
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 2: Browser verification**

Verify:

1. Anonymous `/app` redirects to `/login`.
2. Google login returns to `/app/[id]`.
3. Returning to `/` shows “Продолжить”.
4. Visiting `/login` while signed in redirects to `/app`.
5. Selecting a first photo starts upload without a save button.
6. The URL stays `/app/[id]` and the editor activates after processing.
7. Replacing a photo starts immediately.
8. History and profile remain reachable.

- [ ] **Step 3: Commit any verification-only fixes**

Stage only intentional source/test changes and use a focused commit message.

- [ ] **Step 4: Push and monitor auto-deploy**

Push `master`, identify the Git-triggered Vercel deployment for the final SHA,
wait for `READY`, then verify `/` and `/api/v1/health` return HTTP 200 and check
the deployment’s runtime error logs.
