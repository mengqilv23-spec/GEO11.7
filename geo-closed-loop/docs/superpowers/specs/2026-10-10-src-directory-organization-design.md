# Source Directory Organization Design

## Goal

Make the source tree easier to scan by grouping business components by feature and sub-responsibility, while preserving runtime behavior, module boundaries, and existing tests. This is a filesystem/import-path refactor, not a behavior rewrite.

## Current observations

- `src/components/onboarding/` mixes buyer-persona, knowledge, monitoring-question, monitoring-plan, and shared onboarding UI files in one flat directory.
- `src/components/pages/` adds an unnecessary `pages` layer around report-center and visibility-monitoring components; the route views already live in `src/views/`.
- Several workbench-specific components sit directly under `src/components/`, while task UI is already grouped under `components/tasks/`.
- `components/ui/ce/` is a coherent shared component library and should remain intact.
- `src/api`, `src/assets`, `src/composables`, `src/data`, `src/layouts`, `src/router`, `src/services`, `src/stores`, `src/styles`, `src/views`, and `src/workflows` are already responsibility-oriented. Do not move them solely for symmetry.
- Existing cross-feature use must remain explicit: report center consumes visibility-monitoring question/source detail drawers, and visibility monitoring reuses the onboarding knowledge editor.

## Proposed organization

```text
src/components/
  workbench/                 # GEO diagnosis/optimization UI and shared shell pieces
  market/                    # Market switcher and market-specific UI
  onboarding/
    buyer-persona/           # Persona step, editor, options, validation, tests
    knowledge/               # Knowledge panels/editor/summary, validation, tests
    monitoring-questions/    # Question step/dialog/data/selection/validation, tests
    monitoring-plan/         # Plan step/data, tests
    shared/                  # Onboarding stepper/help/action bar and shared onboarding UI
  report-center/             # Report center cards, list, cadence and preview drawer/tests
  visibility-monitoring/
    analysis/                # Overview, brand analysis, chart options and tests
    questions/               # Question detail and question-related UI/models/tests
    sources/                 # Source tracking/detail and source view-model/tests
    sampling/                # Sampling trust/rules and sampling setup UI
    settings/                # Monitoring configuration dialogs/setup UI
  tasks/                     # Keep task-only UI together, including TaskWorkspace
  ui/                        # Keep generic UI and the CE library unchanged
```

Route-level pages stay in `src/views/`; application layers such as stores, router, services, and styles remain in their current directories. Existing feature data in `src/data/` remains grouped there unless the implementation audit finds a strong reason to colocate a particular helper; any such exception must be listed in the execution plan before moving it.

## Rules

1. Move files only when the target directory communicates their existing responsibility more clearly.
2. Keep each `*.test.ts` beside its corresponding implementation/component after moving it; do not delete or rewrite tests as part of the reorganization.
3. Preserve component names, exports, route names, runtime behavior, styles, and user-visible copy.
4. Update all import paths and test references mechanically; avoid drive-by logic cleanup.
5. Keep shared CE UI and already-cohesive top-level source directories untouched.
6. Preserve the current worktree state and do not commit unrelated changes.

## Acceptance criteria

- The flat business-component directories are replaced by clear responsibility groups.
- All existing source and test files are accounted for; no test file is removed.
- No imports point to old paths, and feature cross-references remain valid.
- `npm test`, `npm run lint`, and `npm run build` pass.
- The final change is limited to moves/import-path updates and this directory-design documentation.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Cross-feature imports become harder to follow | Keep the current shared detail/editor ownership explicit and verify all import references after moves. |
| Large relative-path churn causes missed imports | Move in small groups, run type-check/build and tests at checkpoints, and search for old paths. |
| Moving files obscures existing user changes | Inspect the working tree before each phase; preserve pre-existing changes and avoid broad formatting. |

## Out of scope

- Changing UI behavior, copy, styling, or data semantics.
- Deleting tests, demo data, or modules based only on apparent lack of use.
- Rewriting stores, route structure, public component contracts, or the shared CE library.
- Renaming components or changing runtime logic.

