# GEO Route Split Design

## Goal

Make diagnosis and optimization distinct route pages instead of conditionally rendering both page components inside one route view, while preserving the shared GEO shell and cross-page state.

## Current behavior

`/diagnosis` and `/optimization` are separate named child routes under `GeoWorkbenchLayout.vue`. The layout owns the shared sidebar, task state, persistence, global drawers, and workflow actions.

## Design

- Keep the existing paths and route names: `/diagnosis` (`diagnosis`) and `/optimization` (`optimization`). Keep `/` redirecting to `diagnosis`.
- Treat `src/layouts/GeoWorkbenchLayout.vue` as the shared GEO layout/shell. It owns the sidebar, workbench state and persistence, shared task workspace, and global detail drawer.
- Configure `src/views/DiagnosisView.vue` and `src/views/OptimizationView.vue` as distinct child routes under that shell. Each named route renders its corresponding content component from `src/components/`.
- Render the active child through `RouterView`; pass the existing page props and event handlers through an explicitly typed route-page adapter/component contract. Do not duplicate business state or page implementations.
- Keep `src/components/GeoSidebar.vue` navigation route-based. Since the layout remains mounted when switching child routes, in-memory shared state remains available; existing local-storage persistence remains unchanged for reloads.
- Preserve cross-page actions, including opening tasks, returning to source strategies, route highlighting, and global drawers.

## Scope and constraints

- Change route composition and the required page/shell wiring only; preserve visual styles, copy, CE component usage, and business rules.
- Do not recreate test files: the user requested removal of all `*.spec.*` tests. Verify with a production build and a browser smoke check of both routes and route switching.
- Keep existing requirements and planning documents untouched.

## Acceptance criteria

- Each named route renders only its corresponding page component inside the shared GEO shell.
- Direct navigation and sidebar navigation work for both existing URLs.
- Shared data, open-task flow, drawer interactions, and route highlighting continue to behave as before.
- `/` redirects to `/diagnosis`.
- `npm run build` passes; browser smoke checks confirm both route pages render and switching routes preserves the shared shell.

