# Renoa Aidentika-Inspired Product UI

Date: 2026-07-29  
Status: approved in conversation for direct implementation  
Theme: dark only  
UI foundation: shadcn/ui conventions with local source components

## Goal

Bring the previously agreed Renoa product direction directly into the existing application without using Figma or Pencil as an implementation source. The visual language is inspired by Aidentika's product clarity and density, while Renoa keeps its own name, lime accent, interior-design content, routes, data model, and canvas interaction.

## Product principles

- After authentication, the user lands directly on `/app/[id]`.
- The room is uploaded directly on the canvas.
- The customer controls only style, format, and requested changes.
- Provider and model names never appear in customer-facing UI.
- Every generation shows its price before launch: 4 credits.
- Technical failures automatically return the reserved credits.
- Successful images expose contextual actions next to the selected result.
- Refinements accept a new prompt, references, and existing visual markup.
- Iteration history is stored as a tree and shown as simple image branches.
- The product uses one dark theme.

## Visual system

Renoa uses a restrained graphite palette:

- background: near-black graphite;
- application shell and navigation: one level lighter;
- cards and controls: elevated graphite;
- borders: low-contrast neutral;
- primary accent: Renoa lime;
- destructive, warning, success, and information colors remain semantic and secondary.

Typography uses Geist Sans for interface copy and Geist Mono for identifiers, dates, counters, credits, and technical status. The interface uses compact shadcn `new-york` density, 10–14 px radii, one-pixel borders, and minimal shadow.

## Application shell

Protected pages share a responsive shell:

- desktop: 72 px top bar, 232 px left navigation, content area;
- tablet: top bar plus compact icon rail;
- mobile: top bar and a shadcn Sheet for navigation.

Top bar contains Renoa brand, current section/project context, credit balance affordance, and profile menu. Sidebar contains:

1. `Создать`;
2. `История`;
3. `Профиль`;
4. `Кредиты`.

## Canvas editor

The existing canvas remains the center of the product.

- Left: compact branch/history rail on desktop; hidden behind a button on smaller screens.
- Center: pannable and zoomable canvas with current source and generated variants.
- Right: root generation inspector with references, prompt, style, format, credit cost, refund explanation, and generation button.
- The existing floating toolbar remains near the canvas.
- Contextual result actions remain anchored to the selected successful image.

The right inspector never displays an AI model or provider. The style row owns its horizontal overflow. The generation action reads `Создать дизайн · 4 кредита`; a supporting line states that technical errors do not consume credits.

## Landing

The landing is dark and product-led:

- compact Renoa header;
- clear hero describing realistic room transformation;
- primary authentication/upload action;
- a real product demonstration: before image, style choice, after image;
- example grid grouped by room and style;
- transparent 4-credit price and refund message;
- final CTA.

The landing uses real room imagery already available to or generated for the product. UI icons come from the existing Lucide library; no text glyphs or fake CSS illustrations are used.

## History, profile, and credits

- History groups generation cards by project and visually communicates root/child relationships without exposing technical IDs.
- Profile shows identity, connected Google login, generation statistics, and credit balance.
- Credits shows packages of 50, 140, 400, 1200, and 5000 credits, the 4-credit generation price, and the automatic refund rule.
- Payment buttons are initially honest UI entry points and must not claim a payment succeeded until a real payment provider is connected.

## Components

Local shadcn-style source components provide:

- `Button`;
- `Card`;
- `Badge`;
- `Separator`;
- `Input`;
- `Textarea`;
- `Skeleton`;
- `Sheet` or existing native dialog behavior where adding Radix would duplicate current accessible logic.

Product components provide:

- `AppShell`;
- `AppSidebar`;
- `AppTopbar`;
- `CreditBalance`;
- `GenerationCost`;
- landing demonstration and examples;
- project branch rail.

## Data and error behaviour

The current API and generation reservation flow remain authoritative. UI cost is read from shared product configuration rather than copied into individual components.

Generation errors:

- validation errors stay inline;
- technical generation failures state that credits were returned;
- insufficient balance points to `/app/credits`;
- no customer-facing error mentions Gemini, Vertex, model codes, or provider names.

## Responsive behaviour

- No page-level horizontal scrolling.
- Only the style picker may scroll horizontally.
- Persistent desktop sidebars become Sheets on narrow screens.
- Primary canvas controls remain reachable at 390 px width and respect safe areas.
- Touch targets are at least 44 px.

## Verification

- Node tests cover shared navigation and 4-credit presentation policy.
- TypeScript, ESLint, Prisma validation, existing tests, and production build pass.
- The local application is visually checked in the in-app browser at desktop and mobile widths.
- The core path is checked: landing → login boundary → `/app/[id]` → upload/source → inspector → selected result actions.

