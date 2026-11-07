# UI Style Guide Audit and Polish Plan

## Overview

Audit the routed pages and shared Vue components against `external-iframe-style-guide.md`, then make focused visual, responsive, and accessibility corrections without changing business behavior or copy.

## Decisions

- Treat the supplied style guide as the source of truth for tokens, type scale, spacing, surfaces, and breakpoints.
- Prefer shared token/component corrections over one-off route overrides.
- Keep existing workflow/data behavior and user-facing copy intact unless the guide explicitly requires a presentation-only change.
- Verify key routes in the local browser; where route guards prevent visual access, rely on route/component tests without mutating the user's existing local app state.

## Tasks

1. Inventory every route, shared component, stylesheet, theme token, and current test/build baseline.
2. Correct shared shell and global interaction styling (focus, reduced motion, surfaces, responsive gutters).
3. Review and polish overview, diagnosis, and optimization pages against the guide.
4. Review and polish task detail, visibility monitoring, report center, onboarding, and market setup.
5. Audit reusable components (forms, buttons, tags, tables, dialogs/drawers, charts) and fix concrete inconsistencies.
6. Verify full test suite, lint, production build, browser routes, keyboard focus, theme/token behavior, and responsive CSS constraints.

## Acceptance criteria

- No unintended page-level horizontal overflow at the guide's breakpoints; wide data tables use local scrolling.
- Shared text, color, focus, surface, radius, and spacing choices use the guide's semantic tokens/scales where applicable.
- Visual states retain textual/non-color cues; form controls and icon actions remain keyboard-accessible and labeled.
- No new Vue runtime warnings are introduced; existing actionable warnings discovered during verification are resolved when in scope.
- `npm test`, `npm run lint`, and `npm run build` pass.


