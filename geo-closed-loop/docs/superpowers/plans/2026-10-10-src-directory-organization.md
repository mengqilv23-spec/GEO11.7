# Source Directory Organization Implementation Plan

> **For agentic workers:** Implement this plan task-by-task in the current workspace. Preserve every existing test and runtime behavior.

**Goal:** Group business components by feature and sub-responsibility so the source tree is easier to scan without changing application behavior.

**Architecture:** Keep route-level views and established application layers in place. Reorganize only business UI under `src/components/`, retain the shared `ui/ce` library, and keep tests beside their corresponding modules. Update import paths mechanically after each move group.

**Tech Stack:** Vue 3, TypeScript, Vitest, ESLint, Vite.

**Spec:** `docs/superpowers/specs/2026-10-10-src-directory-organization-design.md`

## Global Constraints

- Preserve component names, exports, route names, runtime behavior, styles, and user-visible copy.
- Keep every `*.test.ts`; move tests with the implementation they cover.
- Keep the shared CE library and responsibility-oriented top-level source directories unchanged.
- Preserve the current worktree state; do not commit.

## Review Focus

- Relative imports in moved Vue SFC scripts still resolve, including type-only imports.
- Cross-feature imports from `ReportCenterView.vue` to monitoring detail drawers still resolve.
- Cross-feature imports from monitoring views to onboarding knowledge UI still resolve.
- Internal sibling imports in tests and utility modules use the new paths.
- Nested relative asset/style references remain valid; check for these before moving.

## Baseline

- `npm test`: 24 test files, 63 tests passed before changes.

## Tasks

### Task 1: Group onboarding components

- [x] Completed; all 24 tests pass and the production build succeeds after this move group.

Move files from `src/components/onboarding/` to these folders, retaining exact filenames:

- `buyer-persona/`: `BuyerPersonaStep.vue`, `BuyerPersonaStep.test.ts`, `BuyerPersonaEditorDialog.vue`, `buyer-persona-options.ts`, `buyer-persona-validation.ts`, `buyer-persona-validation.test.ts`.
- `knowledge/`: `BrandKnowledgePanel.vue`, `CompetitorKnowledgePanel.vue`, `KnowledgeEditorDialog.vue`, `KnowledgeSummaryCard.vue`, `MarketLanguagePanel.vue`, `ProductKnowledgePanel.vue`, `knowledge-validation.ts`, `knowledge-validation.test.ts`.
- `monitoring-questions/`: `CustomMonitoringQuestionDialog.vue`, `MonitoringQuestionStep.vue`, `MonitoringQuestionStep.test.ts`, `monitoring-question-data.ts`, `monitoring-question-selection.ts`, `monitoring-question-selection.test.ts`, `monitoring-question-validation.ts`, `monitoring-question-validation.test.ts`.
- `monitoring-plan/`: `MonitoringPlanStep.vue`, `MonitoringPlanStep.test.ts`, `monitoring-plan.ts`, `monitoring-plan.test.ts`.
- `shared/`: `BottomActionBar.vue`, `OnboardingHelp.vue`, `OnboardingSteps.vue`.

Update local imports among these files and references in `src/views/`, `src/stores/`, `src/components/`, and tests. Run `npm test` and `npm run build` after this group.

### Task 2: Group workbench, market, and task UI

- [x] Completed; all 63 tests pass and the production build succeeds. External stylesheet paths moved with their consuming components.

- Move `MarketSwitcher.vue` to `src/components/market/`.
- Move `DiagnosisContent.vue`, `DeferredGeoRadarChart.vue`, `GeoRadarChart.vue`, and `PersonaGapCard.vue` to `src/components/workbench/diagnosis/`.
- Move `OptimizationContent.vue` to `src/components/workbench/optimization/`.
- Move `GeoDrawer.vue` and `GeoSidebar.vue` to `src/components/workbench/shared/`.
- Move `TaskWorkspace.vue` into the existing `src/components/tasks/` directory.

Update all consumer and sibling imports. Run `npm test` and `npm run build` after this group.

### Task 3: Remove the redundant report-center component layer

- [x] Completed; all 63 tests pass and the production build succeeds after the move.

Move `CadenceSelector.vue`, `LatestReportCard.vue`, `ReportListPanel.vue`, `ReportListPanel.test.ts`, `ReportPreviewDrawer.vue`, and `ReportPreviewDrawer.test.ts` from `src/components/pages/report-center/` to `src/components/report-center/`.

Update `src/views/ReportCenterView.vue` and any internal imports. Run `npm test` and `npm run build` after this group.

### Task 4: Group visibility-monitoring components by responsibility

- [x] Completed; all 63 tests pass and the production build succeeds after the move.

Move files from `src/components/pages/visibility-monitoring/` to the groups below, retaining exact filenames:

- `analysis/`: `BrandMentionAnalysis.vue`, `MonitoringEChart.vue`, `MonitoringOverview.vue`, `MonitoringOverview.test.ts`, `chart-options.ts`, `chart-options.test.ts`, `PotentialCompetitorReviewDialog.vue`, `potential-competitor-data.ts`.
- `questions/`: `AddMonitoringQuestionDialog.vue`, `QuestionDetailDrawer.vue`, `QuestionDetailDrawer.test.ts`, `QuestionHitDetails.vue`, `question-view-model.ts`, `question-view-model.test.ts`.
- `sources/`: `SourceDetailDrawer.vue`, `SourceDetailDrawer.test.ts`, `SourceDomainTracking.vue`, `source-view-model.ts`, `source-view-model.test.ts`.
- `sampling/`: `SamplingRulesPanel.vue`, `SamplingTrustSection.vue`.
- `settings/`: `MonitoringSettingsDialog.vue`, `MonitoringSettingsDialog.test.ts`, `MonitoringSetupStage.vue`, `CurrentBrandKnowledge.vue`, `MonitoringProcessNav.vue`.

Update feature-internal imports and all consumers, including report center and onboarding. Search the repository for old `components/pages/visibility-monitoring` and `components/pages/report-center` paths. Run `npm test` and `npm run build` after this group.

### Task 5: Final verification and inventory

- [x] Completed; 24 test files / 63 tests pass, lint and production build pass, and old `components/pages/` references are absent.

- Confirm old component paths no longer exist and no imports reference the removed `components/pages/` hierarchy.
- Confirm the count and names of tests match the pre-move inventory (24 test files, 63 tests).
- Run `npm test`, `npm run lint`, and `npm run build` on the final tree.
- Review `git status --short` and the diff to ensure only the approved design/plan documents, file moves, and import-path changes are present.

## Execution Notes

- This is a path-only refactor; no new tests are required. Existing tests are the behavior-preservation check, while `vue-tsc`/Vite build validates moved imports and component resolution.
- The plan is executed natively in this session, as requested. Work remains uncommitted in the shared workspace.

