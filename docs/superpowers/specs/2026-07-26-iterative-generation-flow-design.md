# Iterative Generation Flow Design

Date: 2026-07-26
Status: Approved in conversation; pending written-spec review

## Goal

Simplify the generation experience so customers focus on the desired interior result rather than AI implementation details. The first design is configured from the existing inspector. Every successful result can then be refined in place with a new prompt, an updated reference set, and optional visual markup.

The implementation must:

- hide model selection from the customer and select Gemini on the server;
- keep style and aspect ratio in the first-generation inspector;
- constrain horizontal style scrolling to the style picker itself;
- expose one universal refinement composer on the selected successful result;
- let the existing canvas tools annotate either the project source or a selected generated result;
- store refinements as a lightweight, queryable generation tree;
- avoid full-history polling while a generation is active.

## User Experience

### First generation

The right inspector remains the entry point for a new root design. It contains:

1. project references;
2. the root prompt;
3. interior style;
4. output aspect ratio;
5. usage information;
6. the primary generation action.

The model selector and all customer-facing model names are removed from this flow. The format controls remain visible in a section named `Формат`, not `Модель и формат`.

The style rail owns its horizontal overflow. The inspector, dialog, page, and workspace must not grow horizontally because of the style cards. Required containment includes `min-width: 0`, `max-width: 100%`, and hidden parent overflow where appropriate; only the style rail uses `overflow-x: auto` and horizontal overscroll containment.

### Selecting and refining a result

Clicking a successful generation selects it on the canvas. Only the selected successful result displays an expanded universal refinement composer below its image. No separate `Доработать` or `Нарисовать подсказку` mode buttons are introduced.

The composer contains:

- a textarea labelled for the selected variant;
- attached-reference thumbnails with removal controls;
- an add-reference affordance;
- drag-and-drop support for reference images;
- a submit action for the child variant;
- inline upload, validation, reservation, and generation errors.

Selecting a different canvas item moves the composer to that item. Selecting the project source returns the inspector and drawing tools to the root-generation context.

### Visual markup

The existing canvas toolbar always targets the currently selected canvas image:

- when the source is selected, drawing updates the project-level visual prompt used by new root generations;
- when a successful generation is selected, drawing updates a client-side refinement draft for that generation.

Generated-result markup is not persisted to PostgreSQL while it is only a draft. The serialized prompt and Fabric canvas state are retained in browser local storage under the customer and parent-generation IDs, so an upload error or accidental navigation does not immediately discard work. Reference binaries are not written to browser storage. On refinement submission, the server creates the visual-prompt asset used by the child generation and stores its identifier on the child. The local draft is deleted after the child reservation succeeds.

The provider receives clean inputs separately:

1. the parent generation's unwatermarked original result as the source;
2. a visual-prompt image derived from the clean source and the annotation layer;
3. the refinement prompt;
4. the submitted reference snapshot.

Markup is guidance only and must not be rendered into the generated result.

### References

Project references in the inspector are the starting reference set for root generations.

The refinement composer starts with the parent generation's reference snapshot. The customer can keep, remove, replace, or add references before submitting the child. The child stores the complete final set of reference identifiers actually sent to Gemini. `GenerationReference` rows duplicate only identifiers and ordering, never file bytes.

New reference files are uploaded once as `MediaFile` objects in Supabase Storage and then linked to the child generation. Temporary uploads that never become linked to a generation are eligible for later orphan cleanup.

### Variant hierarchy

The UI presents refinements as branches:

```text
Variant 1
├── Variant 1.1
│   └── Variant 1.1.1
└── Variant 1.2
```

Variant labels are presentation data derived from stable sibling order (`createdAt`, then `id`). They are not stored as business identifiers. Generation UUIDs remain the canonical identifiers.

## Data Model

`Generation` gains a nullable self-reference:

```prisma
parentGenerationId String?      @db.Uuid
parentGeneration   Generation?  @relation("GenerationRefinements", fields: [parentGenerationId], references: [id])
refinements         Generation[] @relation("GenerationRefinements")
```

It also gains:

```prisma
@@index([parentGenerationId, createdAt])
```

The existing `@@index([projectId, createdAt])`, `@@index([userId, createdAt])`, and `@@index([status, queuedAt])` remain. No `rootGenerationId`, conversation JSON, or separate revision table is added.

### Root generation snapshot

A root generation has:

- `parentGenerationId = null`;
- `sourceImageId = project.sourceImageId`;
- server-selected Gemini `modelId`;
- customer-selected `styleCode` and `aspectRatio`;
- the root prompt;
- a snapshot of project references;
- the project visual prompt, when present.

### Child generation snapshot

A child generation has:

- `parentGenerationId = parent.id`;
- `sourceImageId = parent.resultOriginalId`;
- `modelId`, `styleCode`, and `aspectRatio` copied from the parent;
- its own refinement prompt;
- the complete submitted reference snapshot;
- its own optional visual-prompt image;
- independent status, usage, result, timing, and error fields.

The parent row and files are immutable inputs to the child. A failed or cancelled child does not mutate the parent.

## Server-owned Gemini Selection

The browser no longer fetches `/api/v1/models` for generation setup and no longer submits `modelCode`.

For root generations, the server resolves one active, plan-allowed Gemini model. Resolution is deterministic and follows model priority. Local development may resolve the configured fake provider only when the application is explicitly running with the fake AI provider; production must resolve Gemini.

For child generations, the server inherits `modelId` from the parent. A child request cannot override the model, style, or aspect ratio.

The database continues storing `modelId` for reproducibility, cost tracking, audit, and future model migrations. Customer-facing cards, comparison dialogs, and details no longer show model names.

## API Design

### Root generation

`POST /api/v1/generations` accepts:

```json
{
  "projectId": "uuid",
  "prompt": "string",
  "aspectRatio": "RATIO_16_9",
  "styleCode": "optional-style"
}
```

`modelCode` is not part of the public schema. Unknown extra fields are rejected so stale clients cannot silently choose a model.

### Refinement draft reference upload

`POST /api/v1/generations/:id/refinement-references` accepts one multipart reference image for a successful owned parent generation and returns a `MediaFile` identifier and preview metadata. It reuses the existing media validation, normalization, and Storage conventions. Uploading does not yet create `GenerationReference` rows.

### Child generation

`POST /api/v1/generations/:id/refinements` accepts multipart form data:

- `prompt`: the refinement text;
- `referenceFileIds`: a JSON-encoded ordered array of owned reference UUIDs;
- `overlay`: an optional transparent PNG exported at editor dimensions;
- `canvasState`: the optional JSON-encoded `VisualPromptCanvasState`.

`overlay` and `canvasState` must either both be present or both be absent. The endpoint validates their dimensions against each other and against the parent result, scales the overlay to the clean original dimensions, composites it over the clean parent result, and stores the resulting visual-prompt WebP. The `idempotency-key` header remains required.

The `:id` parameter identifies the parent. The endpoint:

1. authenticates the customer;
2. locks or transactionally validates the owned successful parent;
3. verifies `resultOriginalId` exists;
4. validates ownership and limits for every reference;
5. inherits the parent model, style, and aspect ratio;
6. creates the child and usage reservation idempotently;
7. schedules the existing worker;
8. returns the child ID and initial status.

The worker continues reading source, visual prompt, references, prompt, model, and format from the child snapshot. It therefore needs no special branch logic after reservation.

## Querying and Load Control

Generation history remains a paginated flat list, with `parentGenerationId` included in each item. The client constructs the visible tree from loaded rows. Pages contain 20 items by default; more rows load only on demand.

After creating a root or child generation:

1. the mutation response provides the new generation ID;
2. the client polls only `GET /api/v1/generations/:id`;
3. polling stops for `SUCCEEDED`, `FAILED`, `REJECTED`, or `CANCELLED`;
4. the project generation list and usage query are invalidated once.

The full generation list is not polled every 1.5 seconds. Removing customer model selection also removes the workspace `/api/v1/models` query.

Images are served through Supabase Storage signed URLs and are not stored in PostgreSQL. Reference inheritance creates only small join rows. The schema deliberately avoids recursive reads, chain JSON rewrites, and duplicated binary objects.

## Authorization and Validation

A refinement is permitted only when:

- the parent belongs to the authenticated customer;
- the parent is not soft-deleted;
- the parent status is `SUCCEEDED`;
- the parent has a clean original result;
- the project remains available;
- every reference belongs to the same customer and is an allowed reference media type;
- prompt, file count, file type, file size, daily usage, and parallel-generation limits pass.

Server code ignores no customer-supplied model, style, format, source, or parent ownership fields because those fields are not accepted. They are resolved from the stored parent.

## Error Behaviour

- A root generation remains usable if a child fails.
- Reference upload errors appear inside the selected result composer and preserve the local draft.
- An unavailable or deleted parent produces a not-found error without exposing ownership information.
- A parent without an original result produces a non-retryable refinement error.
- Limit and parallel-generation errors use the existing reservation error contracts.
- Polling network failures are retried with bounded backoff; terminal generation failures stop polling and display on the child card.
- Temporary uploaded references are not automatically deleted during the request that fails, preventing accidental removal of an object another idempotent retry may use. A separate retention cleanup can remove old unlinked media.

## Component Boundaries

- `DesignWorkspace`: selection, root/child mutations, scoped query invalidation, and active-generation polling IDs.
- `DesignInspector`: root-only prompt, project references, style, format, usage, and root action.
- `StylePicker`: width containment and local horizontal scrolling.
- `GenerationCanvasCard`: selected-state rendering and refinement-composer placement.
- `GenerationRefinementComposer`: refinement prompt, reference draft, upload state, submit state, and errors.
- `CanvasViewport` / visual-prompt editor: target image selection and isolated canvas state per target.
- generation reservation service: separate root and child input resolution sharing usage/idempotency checks.
- generation worker: consumes immutable generation snapshots without knowing whether a row is a root or child.

## Testing

### Data and services

- Prisma relation and migration validation.
- Root reservation selects the configured server-owned Gemini model.
- Public root input rejects `modelCode`.
- Child reservation rejects foreign, deleted, incomplete, and non-successful parents.
- Child inherits model, style, and aspect ratio.
- Child source is the parent's `resultOriginalId`.
- Child stores the exact submitted reference order and visual prompt.
- Creating one branch does not mutate its parent or sibling.
- Idempotent refinement retries return the existing child.

### API

- Authentication and ownership failures.
- Reference ownership, type, count, and size validation.
- Generation and parallel-limit errors.
- Successful child response and terminal status polling.

### UI

- Model query and selector are absent.
- Format remains available.
- Only the style rail has horizontal overflow.
- Selecting a successful card opens exactly one composer.
- Selecting another item moves or closes the composer.
- Drawing targets the selected source or result.
- Uploaded references can be added and removed.
- A child request contains only prompt, references, and annotation.
- Full-list polling does not run while a generation is active.

### Verification

Run unit tests, Prisma validation and migration checks, TypeScript, ESLint, production build, and a browser verification of:

1. first generation;
2. result selection;
3. inline refinement with a new reference;
4. generated-result markup;
5. child completion and branch rendering;
6. responsive inspector containment without page-level horizontal scrolling.

## Out of Scope

- A chat-style conversation panel.
- Customer-selectable AI models.
- Changing style or aspect ratio inside an existing branch.
- Persisting variant labels as database identifiers.
- A separate generation-session or revision table.
- Realtime subscriptions or event-stream infrastructure.
- Automated deletion of old orphaned reference uploads in the same release.
