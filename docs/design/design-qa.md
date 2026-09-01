# Design QA

- Source visual truth: `/var/folders/db/jl3v8y0s7pqcbyq_ty9fpgkh0000gn/T/TemporaryItems/NSIRD_screencaptureui_dWyUsA/Снимок экрана — 2026-08-12 в 23.06.33.png`
- Source dimensions: 1820 × 762 px.
- Implementation screenshot: unavailable because the in-app browser timed out twice on `Page.captureScreenshot` and reset the QA session.
- Intended responsive viewports: 375, 768 and 1440 px; the 1440 × 900 DOM viewport was applied and verified before screenshot capture failed.
- Density normalization: not applicable; no post-fix implementation capture was available.
- State: authenticated production workspace with one source image, one completed root generation and one completed refinement.

## Full-view comparison evidence

The source screenshot shows a P1 mismatch: the completed-generation frame is taller than the source-image frame. Code inspection confirmed that the source frame used the source image ratio while each generation frame independently used the generated file ratio.

The implementation now derives one `sourceCardHeight` from the source image and uses it for the source frame, every generation frame, canvas bounds, selection bounds, focus calculations, and wrapped-row layout.

## Focused region comparison evidence

Focused comparison target: the source and generation cards visible in the reference. Production authentication and the full happy path now work, but a post-fix browser capture could not be saved because the in-app screenshot command repeatedly timed out even after selecting a fresh active tab and waiting for all images to load.

## Findings

- [Resolved P1] Source and generated frames used different heights.
  - Fix: all comparison cards now use the source-derived `sourceCardHeight`.
  - Automated evidence: layout and component contract tests pass.
- [Resolved] Access to the authenticated production workspace.
  - Evidence: Google session opened the workspace, production upload, root generation, refinement and reload persistence all passed on 1 September 2026.
- [Blocked] Screenshot-backed responsive visual confirmation at 375, 768 and 1440 px.
  - Blocker: the in-app browser successfully applied the 1440 × 900 viewport and reported all source/result images loaded, but two screenshot calls timed out and reset the browser-control session. The audit skill does not allow a `passed` result without saved and inspected screenshots.

## Required fidelity surfaces

- Fonts and typography: unchanged by this patch.
- Spacing and layout rhythm: frame width, header height, gaps, radii, and positions remain unchanged; generation height now matches the source frame.
- Colors and visual tokens: unchanged.
- Image quality and asset fidelity: source assets are unchanged. Generated images continue using the existing rendering behavior.
- Copy and content: unchanged.

## Comparison history

1. Reference finding: generated frame taller than source frame.
2. Fix: removed result-specific frame sizing and made source-derived height the single layout value.
3. Authenticated production evidence: root generation and refinement succeeded and persisted after reload.
4. Responsive capture attempt: 1440 × 900 DOM viewport applied; all images reported complete; screenshot capture failed twice in the browser backend.

final result: blocked
