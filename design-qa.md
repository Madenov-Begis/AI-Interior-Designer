# Design QA — Renoa full application flow

## Findings

- [P1] Protected product screens cannot be visually compared yet
  - Location: `/app/[id]`, `/app/history`, `/app/profile`, `/app/credits`.
  - Evidence: the source visual truth is the user's supplied Aidentika
    screenshots for the empty canvas, populated canvas, classic project view,
    project library, account menu, credit store, and profile. The in-app
    browser currently redirects every protected Renoa route to
    `/login?next=...`, so there is no browser-rendered implementation capture
    for those matching authenticated states.
  - Impact: typography, spacing, node scale, image crop, menu position, and
    responsive behavior of the redesigned internal application cannot receive
    the required side-by-side visual approval from code inspection alone.
  - Fix: sign in once in the open local preview, then capture and compare the
    empty canvas, populated canvas, project library, account menu, credit store,
    and profile at the same viewport/state as the supplied screenshots.
  - Latest check: the in-app browser reached Google's account chooser, but the
    available account is signed out, so the authenticated canvas still cannot
    be captured without user authentication.

## Source visual truth

- User-provided Aidentika screenshots:
  - Empty classic project view with direct upload.
  - Populated classic project view and result.
  - Full workflow canvas.
  - Project library.
  - Open account menu.
  - Credit store.
  - Profile overview and account data.
  - Empty canvas upload node.
- Floating refinement visual target:
  `/var/folders/db/jl3v8y0s7pqcbyq_ty9fpgkh0000gn/T/TemporaryItems/NSIRD_screencaptureui_coLtFd/Снимок экрана — 2026-07-29 в 23.10.59.png`
  (`3024×1964` px, desktop selected-result state).
- Public landing reference:
  `.codex/design-qa/aidentika-source-1280x720.png`.

## Implementation evidence

- Public landing:
  `.codex/design-qa/renoa-implementation-1280x720-final.png`.
- Protected implementation screenshot: unavailable until the local browser
  has an authenticated session.
- Floating refinement implementation screenshot: unavailable for the same
  authentication reason. The local route redirects to
  `/login?next=/app/d6c0c420-286a-43b6-95c6-9d7e70a8364f`.
- Browser viewport checks completed:
  - Landing: 1280×720 CSS px, `scrollWidth` 1280, no console errors.
  - Login: responsive narrow viewport, no horizontal overflow, no console
    errors.
- Auth state: unauthenticated; `/app` correctly redirects to
  `/login?next=%2Fapp`.

## Full-view and focused comparison evidence

- Public landing full-view comparison:
  `.codex/design-qa/hero-comparison-final.png`.
- Internal full-view comparison: blocked by the missing authenticated render.
- Focused internal comparisons: blocked for the same reason.

## Required fidelity surfaces

- Fonts and typography: Geist, black italic display hierarchy, compact UI
  labels, and mono numeric details are implemented through shared tokens;
  authenticated visual confirmation is pending.
- Spacing and layout rhythm: 72px header, 24px panels, 18px cards, free-canvas
  result cards, a persistent settings inspector, and dashboard grids are
  implemented; authenticated visual confirmation is pending.
- Colors and tokens: graphite canvas/surfaces, muted gray text, and lime
  `#a9ed32` accent are centralized in `globals.css` and
  `src/config/design-system.ts`.
- Image quality: project and generation cards use real signed user media; no
  fake thumbnails or drawn image substitutes were added.
- Copy and content: all labels are adapted to Renoa's interior-redesign
  workflow.
- Icons: existing Lucide components are used consistently; no handcrafted SVG
  or placeholder icon art was added.
- Accessibility: semantic links/buttons, focus rings, labels, alt text, and
  practical control heights are preserved.

## Implemented flow

1. Login preserves `next=/app`.
2. `/app` gets or creates the entry project and redirects directly to its
   canvas.
3. Empty projects show photo upload directly on the dotted canvas.
4. Selecting a room photo keeps the user in the same upload node while the
   request is pending, then opens the populated workspace directly. The
   separate local-preview, full-canvas processing, and success interstitials
   have been removed.
5. Populated projects keep the room photo and results/refinement branches on
   the free canvas, with generation settings in the right-side inspector or
   mobile dialog.
6. The arrow tool now both pans empty canvas space and selects canvas items;
   the separate hand tool has been removed. Selecting a successful result
   reveals a contextual toolbar; «Доработать» opens a compact non-modal
   popover anchored to the selected image.
7. The style carousel supports trackpad scrolling, vertical-wheel translation,
   keyboard focus, and explicit previous/next controls.
8. Project library includes search, grid/list switching, create, duplicate,
   delete, and real project previews.
9. Account menu exposes balance, credit store, profile, and logout.
10. Profile includes projects, balance, generated count, account data, and
   connected Google identity.
11. Credit store exposes the live package catalog, checkout actions, balance,
   refund policy, and transaction history.

## Automated verification

- `pnpm test`: 145 tests passed, including non-modal refinement presentation
  and keyboard behavior.
- `pnpm typecheck`: passed.
- `pnpm exec eslint . --ignore-pattern '.worktrees/**'`: passed.
- `pnpm build`: production build passed.

## Comparison history

1. Earlier landing-only pass: public landing matched the source direction, but
   the internal application was not fully redesigned.
2. Current implementation pass: introduced the Renoa design system and
   rebuilt the protected library, account, and balance flows. The generation
   page was restored to its prior free-canvas and side-inspector interaction
   model at the user's request. Visual QA remains blocked only because those
   protected routes cannot be rendered without a local authenticated browser
   session.
3. Direct-upload pass: removed the two intermediate photo states so a
   successful upload transitions directly from the upload node to the
   populated canvas shown in the user's final reference screenshot. The
   authenticated transition still cannot be captured in the in-app browser.
4. Canvas interaction pass: consolidated select and pan into the arrow tool,
   added contextual result actions, and repaired the inspector's horizontal
   style navigation.
5. Refinement popover pass: restored the approved
   `2026-07-28-floating-refinement-composer` behavior. Selection keeps the
   editor closed, «Доработать» opens an anchored non-modal panel, backdrop
   blocking is removed, and the action bar/panel use compact dimensions based
   on the supplied third screenshot. Automated checks pass; authenticated
   browser comparison remains blocked.
6. Compact action pass: anchored the toolbar using its own compact height so
   opening the editor no longer moves it above the selected image, reduced the
   toolbar and editor dimensions, and removed result duplication from the
   customer workflow.

## Implementation checklist

- [x] Centralize design tokens and primitives.
- [x] Rebuild global app header and account menu.
- [x] Keep direct photo upload on the empty canvas.
- [x] Restore generation settings to the right-side inspector.
- [x] Consolidate canvas selection and panning into the arrow tool.
- [x] Show contextual actions after selecting a generated image.
- [x] Open refinement as an anchored non-modal popover.
- [x] Keep the compact two-action toolbar directly below the selected image.
- [x] Repair horizontal navigation in the style picker.
- [x] Rebuild project library.
- [x] Rebuild profile.
- [x] Rebuild credit store.
- [x] Preserve backend behavior and production build.
- [ ] Capture and compare authenticated screens after sign-in.

final result: blocked
