# Design QA — ROOVA Pricing

- Source visual truth: `/var/folders/db/jl3v8y0s7pqcbyq_ty9fpgkh0000gn/T/TemporaryItems/NSIRD_screencaptureui_0HXzhR/Снимок экрана — 2026-08-08 в 22.43.30.png`
- Implementation screenshot: `/tmp/roova-current-qa-viewport.png`
- Mobile implementation screenshot: `/tmp/roova-pricing-mobile-final-2.png`
- Combined comparison: `/tmp/roova-pricing-comparison.png`
- Desktop viewport: `1440 × 960` CSS px, device scale factor `1`
- Mobile viewport: `390 × 844` CSS px, device scale factor `1`
- Source pixels: `1972 × 1277`; pricing content normalized from a `1644 × 825` crop to `1440 × 723`
- Implementation pixels: `1440 × 960`; pricing section occupies approximately `1440 × 857`
- State: public landing page, pricing section, unauthenticated user

## Full-view comparison evidence

The normalized source and implementation are stacked in `/tmp/roova-pricing-comparison.png`. The implementation preserves the selected reference's hierarchy: centered heading and currency explanation, equal compact package cards, a floating popular badge, benefit rows, full-width purchase actions, and a separate free-start banner.

## Required fidelity surfaces

- Fonts and typography: the italic package names, heavy prices, compact supporting copy, and centered section hierarchy follow the reference. ROOVA keeps its existing Geist-based typography rather than copying the source brand font.
- Spacing and layout rhythm: three equal cards align on one desktop row with consistent padding, radii, dividers, CTA position, and banner spacing. Mobile stacks without horizontal overflow.
- Colors and visual tokens: near-black ROOVA background, white cards, lime primary action, and mint confirmation icons preserve the reference contrast while remaining inside ROOVA's established palette.
- Image quality and assets: the section contains no raster imagery. All interface icons come from the project's existing Lucide icon system; no placeholder, custom SVG, or handcrafted icon assets were introduced.
- Copy and content: prices, credit counts, generation counts, and free-credit terms use ROOVA's real product configuration. Source-specific product terminology was not copied.

## Findings

No actionable P0, P1, or P2 differences remain.

Intentional product constraints:

- ROOVA has three real packages, so the implementation uses three cards rather than inventing a fourth.
- The source's cyan gradient is replaced with ROOVA's dark grid surface to avoid brand imitation and remain consistent with the rest of the landing page.
- Source prices, package names, and usage units are replaced with ROOVA's actual data.

## Interaction and responsive checks

- All three `Купить` links target `/app/credits`.
- Unauthenticated click verified: `/login?next=%2Fapp%2Fcredits`.
- Free-start CTA targets `/app`.
- Desktop and `390 × 844` mobile layouts verified.
- Browser console errors: none.

## Comparison history

- Pass 1: no P0/P1/P2 issues found. The compact card density, popular state, CTA hierarchy, and free-start banner match the selected composition closely enough while preserving ROOVA branding and real package data.

## Follow-up polish

- P3: an original ROOVA ambient background asset could add more depth later, but it is not required for clarity or fidelity of the pricing interaction.

final result: passed
