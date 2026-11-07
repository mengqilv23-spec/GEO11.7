# Report Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a report-center route with local demo report workflows and complete the four evidence/report drawers shown in the approved design.

**Architecture:** Keep report examples and report-state helpers in a focused data module; render the page inside the existing `GeoWorkbenchLayout` and global sidebar. Reuse the existing visibility-monitoring data records for evidence, convert the existing question/source detail surfaces to the CE `Drawer`, and add a separate report-preview drawer.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Vue Router, Vitest, existing CE `Drawer` and design tokens.

**Spec:** `docs/superpowers/specs/2026-10-10-report-center-design.md`

## Global Constraints

- Report samples, quota, and interactions remain front-end demo state; do not add backend, AI, billing, subscription, or persistence calls.
- Reuse the existing global left navigation; do not add another application sidebar.
- Reuse `visibilityMonitoringData` records for questions, source domains, and cited pages.
- The four detail surfaces use the project CE `Drawer`; retain keyboard/focus/backdrop behavior supplied by that component.
- Responsive layouts must avoid page-level horizontal overflow; tables may scroll within their own containers.

## Review Focus

- Empty or filtered report lists: show an explicit empty state and keep type counts/filter selection coherent. Test in the report data/view task.
- Quota at zero: disable generation without decrementing below zero or creating a report. Test in the report data/view task.
- Long German question titles and domain names at narrow widths: wrap inside drawer content without expanding the viewport. Verify in browser at 320px and 200% zoom.
- Cross-drawer navigation and close: selecting a cited page/question replaces the current detail, and closing returns to the originating surface. Test in drawer integration tasks.
- Deep links and existing onboarding guard: report center loads directly while visibility-monitoring keeps its existing guard. Test in router task.

---

## File Structure

- `src/data/report-center-data.ts`: report/cadence demo records, local quota defaults, and pure filtering/generation helpers.
- `src/data/report-center-data.test.ts`: deterministic tests for filtering, counts, newest-first order, and quota behavior.
- `src/views/ReportCenterView.vue`: report center layout, page-local interaction state, and evidence-drawer coordination.
- `src/components/pages/report-center/LatestReportCard.vue`: latest-report summary, quota display, generate action, and quota-view toggle.
- `src/components/pages/report-center/CadenceSelector.vue`: selectable weekly/monthly/quarterly cadence cards.
- `src/components/pages/report-center/ReportListPanel.vue`: report-type rail, counts, report cards, and empty state.
- `src/components/pages/report-center/ReportPreviewDrawer.vue`: report preview and quarterly structure drawer.
- `src/components/pages/report-center/ReportPreviewDrawer.test.ts`: report/outline rendering and dismissal behavior.
- `src/components/pages/report-center/report-center.css` (only if shared selectors are required): responsive report-center visual rules; otherwise keep styles scoped in the view/component.
- `src/router/index.ts`: register `report-center` under the workbench layout.
- `src/router/visibility-monitoring.test.ts`: assert report route metadata and existing visibility route guard behavior.
- `src/components/GeoSidebar.vue`: add the report-center navigation item and active state.
- `src/layouts/GeoWorkbenchLayout.vue`: map the report route to the correct active sidebar item.
- `src/components/pages/visibility-monitoring/QuestionDetailDrawer.vue`: migrate to CE `Drawer`; add batch selection, per-platform expansion, and evidence links.
- `src/components/pages/visibility-monitoring/QuestionDetailDrawer.test.ts`: test batch selection, answer expansion, and cited-page selection.
- `src/components/pages/visibility-monitoring/SourceDetailDrawer.vue`: migrate to CE `Drawer`; distinguish domain/page details and add related record navigation.
- `src/components/pages/visibility-monitoring/SourceDetailDrawer.test.ts`: test domain/page content and question/page navigation events.
- `src/views/VisibilityMonitoringView.vue`: connect source/page/question drawer events while preserving current entry points.
- `src/views/visibility-monitoring-integration.test.ts`: add regression coverage for the existing monitoring route/detail-entry integration where practical.

## Tasks

### Task 1: Report data and deterministic state helpers

**Files:**
- Create: `src/data/report-center-data.ts`
- Create: `src/data/report-center-data.test.ts`

**Interfaces:**
- Export `ReportType = 'weekly' | 'monthly' | 'quarterly'` and `ReportRecord` with `id`, `type`, `title`, `period`, `date`, `summary`, `tags`, `sections: { title, summary }[]`, `questionIds: string[]`, and `status: 'generated' | 'outline'`.
- Export `initialReports`, `initialMonthlyQuota`, `filterReports(reports, type)`, and `createDemoReport(reports, quota, now?)`.
- `createDemoReport` returns `{ reports, quota, report }` when quota is positive; when quota is zero it returns the same list/quota and `report: null`.

- [x] **Step 1: Add failing tests for report filtering, counts, sorting, and quota boundaries.** Cover all report type filters, `all`, empty results, ordering by date descending, one successful local generation, and zero quota.
- [x] **Step 2: Run `npm test -- src/data/report-center-data.test.ts` and confirm the tests fail because the module is absent.**
- [x] **Step 3: Add typed report fixtures and pure helpers.** Keep fixtures aligned with the approved screenshot: two weekly, one monthly, and one quarterly report; generation must label its output as demo data.
- [x] **Step 4: Run `npm test -- src/data/report-center-data.test.ts` and confirm all cases pass.**
- [x] **Step 5: Commit only the two report-data files with `git add src/data/report-center-data.ts src/data/report-center-data.test.ts && git commit -m "feat: add report center demo data"`.** (Not run: changes remain uncommitted because the safe fallback checkout is `master`; see ledger ruling.)

### Task 2: Route and global navigation

**Files:**
- Modify: `src/router/index.ts`
- Modify: `src/components/GeoSidebar.vue`
- Modify: `src/layouts/GeoWorkbenchLayout.vue`
- Create: `src/views/ReportCenterView.vue` (initial page shell, completed in Task 3)
- Modify: `src/router/visibility-monitoring.test.ts`

**Interfaces:**
- Route name/path/title: `report-center`, `/report-center`, `报告中心`.
- Sidebar active page union becomes `GeoPage | 'visibility-monitoring' | 'report-center'`.

- [x] **Step 1: Extend router tests to assert the report-center path/name/title and that it is under `GeoWorkbenchLayout`; retain assertions that visibility monitoring is guarded.**
- [x] **Step 2: Run `npm test -- src/router/visibility-monitoring.test.ts` and verify the new route assertion fails.**
- [x] **Step 3: Create the initial `ReportCenterView.vue` page shell, register it as a lazy route, add the sidebar link, and map the route name to the `report-center` active state.**
- [x] **Step 4: Run `npm test -- src/router/visibility-monitoring.test.ts` and `npm run build`.**
- [x] **Step 5: Commit only the router, sidebar, layout, and router-test files with `git add ... && git commit -m "feat: add report center navigation"`.** (Not run: changes remain uncommitted because the safe fallback checkout is `master`; see ledger ruling.)

### Task 3: Report center page and local interactions

**Files:**
- Create: `src/views/ReportCenterView.vue`
- Modify: `src/data/report-center-data.ts` (only if a missing pure helper is exposed by tests)
- Test: `src/views/ReportCenterView.test.ts`
- Create: `src/components/pages/report-center/LatestReportCard.vue`
- Create: `src/components/pages/report-center/ReportListPanel.vue`
- Create: `src/components/pages/report-center/CadenceSelector.vue`
- Test: `src/components/pages/report-center/ReportListPanel.test.ts`

**Interfaces:**
- Consume `initialReports`, `initialMonthlyQuota`, `filterReports`, and `createDemoReport` from Task 1.
- Emit no global events; keep cadence, selected type, usage display, and quota state local to the view.
- Open report details by passing the selected `ReportRecord` into `ReportPreviewDrawer` from Task 6.

- [ ] **Step 1: Add a report-list component test covering type counts/filtering, empty state, and report opening; add a view test covering latest report, cadence selection, and local generation/quota.**
- [ ] **Step 2: Run `npm test -- src/views/ReportCenterView.test.ts src/components/pages/report-center/ReportListPanel.test.ts` and verify it fails before the interactions are implemented.**
- [ ] **Step 3: Build focused latest-report, cadence-selector, and report-list components; compose them in the route view with the approved copy and local data helpers.**
- [ ] **Step 4: Add report content-boundary note and responsive rules: collapse the two-column report list, keep controls usable on narrow screens, and contain any table scrolling within its panel.**
- [ ] **Step 5: Run `npm test -- src/views/ReportCenterView.test.ts src/components/pages/report-center/ReportListPanel.test.ts` and `npm run build`; fix failures without weakening assertions.**
- [ ] **Step 6: Commit only the report view and its test with `git add ... && git commit -m "feat: build report center page"`.**

### Task 4: Question evidence drawer migration and interactions

**Files:**
- Modify: `src/components/pages/visibility-monitoring/QuestionDetailDrawer.vue`
- Create: `src/components/pages/visibility-monitoring/QuestionDetailDrawer.test.ts`
- Modify: `src/views/VisibilityMonitoringView.vue` only if the drawer event interface needs a typed forwarding handler.

**Interfaces:**
- Keep props `question`, `open`, and `platforms`; retain `close` and `selectSource(sourceId)` events.
- Add a selected sampling-batch control and a platform-answer expanded/collapsed state.
- Use only values present in the shared visibility data; where historical per-batch platform outcomes are unavailable, show an explicit unavailable state rather than inventing chart values or changing answers when a batch is selected.

- [ ] **Step 1: Write component tests that select another batch, expand/collapse a platform answer, and emit the cited page ID from its link.**
- [ ] **Step 2: Run `npm test -- src/components/pages/visibility-monitoring/QuestionDetailDrawer.test.ts` and verify the expanded behaviors fail.**
- [ ] **Step 3: Replace the native dialog shell with CE `Drawer`, preserving a fixed heading and independently scrolling body; adapt the existing summary to the approved comprehensive-performance, sampling, brand-mention, citation-page, trend, and answer-detail sections.**
- [ ] **Step 4: Implement batch selection and platform accordion behavior; expose cited-page navigation from the expanded answer.**
- [ ] **Step 5: Run the focused component test and existing visibility tests: `npm test -- src/components/pages/visibility-monitoring/QuestionDetailDrawer.test.ts src/views/visibility-monitoring-integration.test.ts`.**
- [ ] **Step 6: Commit only the question drawer and its tests (plus the view if changed) with `git add ... && git commit -m "feat: expand question evidence drawer"`.**

### Task 5: Source-domain and cited-page drawer migration

**Files:**
- Modify: `src/components/pages/visibility-monitoring/SourceDetailDrawer.vue`
- Create: `src/components/pages/visibility-monitoring/SourceDetailDrawer.test.ts`
- Modify: `src/views/VisibilityMonitoringView.vue`

**Interfaces:**
- Preserve `source: SourceDomain | CitedPage | null`, `open`, and `close`.
- Add typed `selectQuestion(questionId)` and `selectPage(pageId)` events; accept related questions, domains, pages, and platform labels as props using existing data types.
- Keep parent selection state mutually exclusive so opening a related record replaces the current drawer content without stacking overlays.

- [ ] **Step 1: Write tests for domain summary/platform counts, cited-page summary/related questions, and emitted question/page selection IDs.**
- [ ] **Step 2: Run `npm test -- src/components/pages/visibility-monitoring/SourceDetailDrawer.test.ts` and confirm the tests fail against the current basic dialog.**
- [ ] **Step 3: Migrate the shell to CE `Drawer` and implement the domain/page-specific tables and metrics from the approved spec.**
- [ ] **Step 4: Wire question-to-page, page-to-question, and domain-to-page navigation through `VisibilityMonitoringView.vue`; preserve all existing domain/page table triggers.**
- [ ] **Step 5: Run the source drawer test and visibility integration tests.**
- [ ] **Step 6: Commit only the source drawer, its test, and the view integration files with `git add ... && git commit -m "feat: add source and cited page drawers"`.**

### Task 6: Report preview and outline drawer

**Files:**
- Create: `src/components/pages/report-center/ReportPreviewDrawer.vue`
- Create: `src/components/pages/report-center/ReportPreviewDrawer.test.ts`
- Modify: `src/views/ReportCenterView.vue`

**Interfaces:**
- Props: `report: ReportRecord | null`, `open: boolean`.
- Emits: `close` and `selectQuestion(questionId)`.
- `status === 'generated'` renders the report summary/sections; `status === 'outline'` renders its structure and chapter descriptions.
- `ReportCenterView.vue` routes evidence links through question and source drawers without stacking overlays.
- `ReportCenterView.vue` hosts the question/source drawers and resolves all links through `visibilityMonitoringData`.

- [ ] **Step 1: Add tests for generated report sections, outline-only content, close emission, and evidence question selection.**
- [ ] **Step 2: Run `npm test -- src/components/pages/report-center/ReportPreviewDrawer.test.ts` and confirm it fails before implementation.**
- [ ] **Step 3: Implement the responsive report drawer with CE `Drawer`, fixed title, scrollable contents, status badge, summary and section/outline content.**
- [ ] **Step 4: Connect report-card actions to the drawer and route evidence links through question-to-page and page-to-question navigation without stacking overlays or leaving the workbench.**
- [ ] **Step 5: Run report drawer, report view, and router tests.**
- [ ] **Step 6: Commit only the preview drawer, its test, and report view changes with `git add ... && git commit -m "feat: add report preview drawer"`.**

### Task 7: Browser verification and regression pass

**Files:**
- Modify only files that fail a concrete acceptance check from the prior tasks.

- [ ] **Step 1: Run `npm test`, `npm run lint`, and `npm run build`; record exact failures before fixing.**
- [ ] **Step 2: Use the local app in a real browser to verify direct `/report-center` navigation, active global sidebar state, cadence and report filters, generation/quota behavior, all four drawers, and cross-record navigation.**
- [ ] **Step 3: Verify viewport widths 320px, 768px, and desktop, plus browser zoom at 200%; confirm no page-level horizontal overflow and that drawer content remains independently scrollable.**
- [ ] **Step 4: Re-run affected tests and all three project checks; inspect `git diff --check` and `git status --short` to ensure only report-center implementation changes remain in scope.**
- [ ] **Step 5: Commit any browser-verification fixes as a focused commit only after confirming the staged paths contain no unrelated changes.**

## Self-Review

- **Spec coverage:** Route/nav in Task 2; report page, cadence, quota, filters, empty state and boundary copy in Tasks 1 and 3; question, domain, cited-page, and report drawers in Tasks 4–6; accessibility/keyboard behavior through CE `Drawer` and browser checks in Tasks 4–7; regression and responsive checks in Task 7.
- **Placeholder scan:** No TODO/TBD steps; each task names files, interfaces, tests, and commands.
- **Type consistency:** Report helpers expose `ReportRecord`; preview consumes that type; question/source drawers use existing `MonitoringQuestion`, `SourceDomain`, `CitedPage`, and `MonitoringPlatformId` types.
- **Review focus coverage:** Empty/quota cases are tested in Task 3; long text and responsive overflow are checked in Task 7; cross-drawer and onboarding behavior are tested in Tasks 2, 4, and 5.

