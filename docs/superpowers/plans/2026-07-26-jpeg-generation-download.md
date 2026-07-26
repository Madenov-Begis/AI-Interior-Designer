# JPEG Generation Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every successful generation download as a valid `.jpg` file without changing stored WebP objects.

**Architecture:** A focused server helper converts stored image bytes to JPEG and generates the attachment filename. The authenticated download route continues to own authorization and Storage access, then returns the helper output with JPEG headers.

**Tech Stack:** Next.js 16 Route Handlers, TypeScript, Sharp, Node.js test runner, Supabase Storage.

## Global Constraints

- Stored generation results remain unchanged.
- JPEG quality is 92.
- Transparency is flattened onto white.
- Output color space is sRGB.
- The response is `image/jpeg` with a `.jpg` attachment filename.
- Existing authentication, ownership checks, and private no-store caching remain intact.

---

### Task 1: Define JPEG Conversion Contract

**Files:**
- Create: `src/features/generations/jpeg-download.test.ts`
- Create: `src/features/generations/jpeg-download.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `convertGenerationDownloadToJpeg(input: Buffer): Promise<Buffer>`
- Produces: `generationDownloadFilename(createdAt: Date): string`

- [ ] **Step 1: Write failing tests**

Create an in-memory 3×2 transparent PNG with Sharp. Assert that conversion
starts with JPEG magic bytes `ff d8 ff`, Sharp reports `jpeg`, output dimensions
remain 3×2, and `hasAlpha` is false. Assert that a UTC date produces
`interior-design-2026-07-26.jpg`.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test`

Expected: FAIL because `jpeg-download.ts` does not exist.

- [ ] **Step 3: Implement the helper**

Use:

```ts
sharp(input)
  .rotate()
  .toColorspace("srgb")
  .flatten({ background: "#ffffff" })
  .jpeg({ quality: 92 })
  .toBuffer()
```

Generate the filename from `createdAt.toISOString().slice(0, 10)`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm test`

Expected: all tests PASS.

### Task 2: Return JPEG from the Download Route

**Files:**
- Modify: `src/app/api/v1/generations/[id]/download/route.ts`

**Interfaces:**
- Consumes: `convertGenerationDownloadToJpeg`, `generationDownloadFilename`

- [ ] **Step 1: Update the route**

After Storage download, convert `downloaded.data.arrayBuffer()` to a Buffer,
pass it to the JPEG helper, and return a `Uint8Array` response body with:

```text
Content-Type: image/jpeg
Content-Disposition: attachment; filename="interior-design-YYYY-MM-DD.jpg"
Cache-Control: private, no-store
```

Keep all current 401, 404, 500, and 502 mappings.

- [ ] **Step 2: Run complete verification**

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

- [ ] **Step 3: Commit**

```bash
git add package.json src/features/generations/jpeg-download.ts src/features/generations/jpeg-download.test.ts 'src/app/api/v1/generations/[id]/download/route.ts'
git commit -m "feat: download generated interiors as JPEG"
```
