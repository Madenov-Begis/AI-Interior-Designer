# Renoa shadcn/ui Component Migration

Date: 2026-07-29  
Status: proposed for implementation  
Scope: replace the existing local UI primitives with registry-generated shadcn/ui components while preserving Renoa's current dark visual language

## Goal

Make shadcn/ui with Radix primitives the real foundation of Renoa's shared UI components. The migration must not redesign the product: existing routes, copy, layout, responsive behavior, dark palette, lime accent, and canvas interactions remain unchanged.

## Components in scope

The following files will be regenerated from the official shadcn `new-york` Radix registry:

- `src/components/ui/button.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/sheet.tsx`

The CLI will add the unified `radix-ui` dependency and any registry-required supporting dependencies.

## Visual compatibility

Renoa's current theme variables in `src/app/globals.css` remain authoritative. Registry components will consume those variables instead of introducing a new palette.

The migration preserves:

- dark-only rendering;
- `#b4f24b` primary accent and semantic status colors;
- Geist typography;
- existing compact control density;
- existing focus visibility;
- existing card, button, input, and badge proportions where they affect current layouts;
- current desktop and mobile responsive behavior.

Registry-generated component source may receive small, explicit Renoa extensions after generation. These extensions are limited to compatibility variants and sizing; they must not replace the Radix primitive or revert the component to a custom implementation.

## API compatibility

### Button

The official component will use `class-variance-authority` and export `Button` and `buttonVariants`.

The existing `buttonClassName(variant, className, size)` helper will temporarily remain as a compatibility wrapper around `buttonVariants`, because it is used by links and labels throughout the application. The existing `primary` variant remains an alias of `default`. Existing sizes `default`, `sm`, `lg`, and `icon` remain available.

### Badge

The official `Badge` implementation and variants become the base. Renoa's existing `success` and `warning` variants remain as theme-driven extensions because they represent real generation and payment states.

### Card, Input, Textarea, Separator, Skeleton

These components use the registry implementations and keep their standard exports. Consumer classes continue to own page-specific padding, height, and layout adjustments.

### Sheet

The native custom `<dialog>` implementation will be removed. The application top bar will migrate to the official Radix-backed composition:

- `Sheet`
- `SheetContent`
- `SheetHeader`
- `SheetTitle`
- `SheetClose`

The navigation sheet remains left-aligned, keeps its current width, and continues to close after navigation. Focus trapping, Escape handling, overlay behavior, focus return, and screen-reader semantics come from Radix.

## Migration sequence

1. Capture a baseline by running the current type checker, linter, tests, and production build.
2. Generate all eight components with the official CLI in one controlled operation.
3. Restore only the documented Renoa compatibility variants and sizes.
4. Adapt the application top bar to the official Sheet composition.
5. Resolve TypeScript failures in consumers without changing product behavior.
6. Run focused component and route-policy tests, followed by the complete test, typecheck, lint, and production-build suites.
7. Visually compare the landing page, login page, and mobile navigation against the current accepted screenshots.

## Accessibility requirements

- Buttons and links retain visible keyboard focus.
- The mobile navigation sheet traps focus while open.
- Escape closes the sheet.
- Closing the sheet returns focus to the menu trigger.
- The sheet exposes an accessible title and close control.
- Disabled controls remain non-interactive and visually distinguishable.
- Existing input labels, validation messages, and `aria-*` relationships remain intact.

## Error and rollback behavior

The CLI dry run must be inspected before overwriting files. If the generated API causes an unresolved regression, the migration stops with the affected generated file and its consumer changes left uncommitted; unrelated product code is not modified.

## Acceptance criteria

- `pnpm exec shadcn info` reports the eight UI components and Radix base.
- The project depends on `radix-ui`.
- The Sheet implementation imports official Radix-backed shadcn primitives rather than using a native `<dialog>`.
- Existing TypeScript consumers compile without unsafe casts.
- Existing tests pass.
- ESLint passes.
- The production build succeeds.
- Landing, login, and mobile navigation retain Renoa's current visual direction and have no page-level horizontal overflow.

