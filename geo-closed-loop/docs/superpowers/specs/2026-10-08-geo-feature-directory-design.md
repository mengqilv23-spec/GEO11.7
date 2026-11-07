# GEO Application Directory Design

## Goal

Keep the single-domain GEO app organized by responsibility without repeating `geo` in every directory name or maintaining a redundant `features/geo` wrapper.

## Directory layout

```text
src/
  App.vue                         # Root RouterView only
  router/
  views/                          # Route-level pages
    DiagnosisView.vue
    OptimizationView.vue
    OnboardingView.vue
  layouts/                        # Shared GEO workbench shell/state
    GeoWorkbenchLayout.vue
  components/                     # GEO business UI
    DiagnosisContent.vue
    OptimizationContent.vue
    TaskWorkspace.vue
    GeoDrawer.vue
    GeoRadarChart.vue
    GeoSidebar.vue
    PersonaGapCard.vue
    onboarding/                    # Onboarding-specific components
    ui/ce/                         # Shared CE component library
  composables/
    workbench-route-context.ts
  data/
    geo-data.ts
  services/
    geo-orchestration.ts
  workflows/
    task-workflow.ts
  styles/
```

## Boundaries

- Route-level screens belong in `views/`; `DiagnosisView` and `OptimizationView` render as separate child routes.
- `GeoWorkbenchLayout` owns the shared sidebar, workbench state/persistence, task workspace, and global drawer for the two GEO routes. `App.vue` remains the global router outlet and does not absorb feature-specific UI/state.
- Reusable business UI belongs in `components/`; the generic CE library remains in `components/ui/ce/`.
- Data, services, workflows, composables, and styles are grouped once by responsibility. Their directory names are not redundantly prefixed with `geo`.
- Onboarding remains its own route and keeps its components under `components/onboarding/`.

## Constraints

- This is a filesystem/import-path refactor; preserve runtime behavior, page contracts, route behavior, and visual styling.
- Do not add, remove, or relocate tests as part of this refactor. The user separately requested deleting spec tests; verify with type-check/build and browser smoke checks.
- Preserve unrelated user changes and do not commit the shared dirty worktree.

