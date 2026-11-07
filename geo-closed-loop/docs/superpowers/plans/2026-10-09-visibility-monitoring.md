# 可见性监测实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将新人引导完成动作接入一个沿用现有工作台外壳的「可见性监测」页面，并实现截图展示的监测分析、ECharts 图表、配置和详情交互。

**Architecture:** 在现有工作台下新增受引导完成状态保护的结果路由和侧栏入口；引导页本身保持无侧栏。所有演示数据与业务类型集中于 `src/data/visibility-monitoring-data.ts`，图表组件只负责把数据渲染为 ECharts 选项，页面区块以独立组件消费数据与事件。

**Tech Stack:** Vue 3 `<script setup lang="ts">`、Vue Router 4、Pinia、ECharts 6 (`echarts/core` + SVG renderer)、Vitest、CE UI 组件。

**Spec:** `docs/superpowers/specs/2026-10-09-visibility-monitoring-design.md`

## Global Constraints

- 新人引导继续无侧栏；结果页沿用现有工作台。
- 统计图表使用 ECharts；不引入新的图表库。
- 首版不做真实监测采集、后端 API/持久化、账号权限、真实采样调度及真实统计计算。
- 截图数字作为演示数据，不宣称为实时结果。
- Claude 等截图中标记暂不开放的平台保持禁用。
- 保留现有路由和功能；不重构无关 GEO 模块。
- 参考用户提供的 `external-iframe-style-guide.md`；沿用项目 Vue/CE/ECharts 技术栈，不添加 React/shadcn/Recharts。
- 内容宽度随可用空间伸缩，不新增统一固定最大宽度；仅保留页面最外层纵向滚动，宽表格局部横向滚动。
- 遵守规范的语义色、文字层级、卡片边框/圆角/内边距与聚焦/禁用/错误状态；窄屏适配到320px和200%缩放。
- 当前 `.git` 索引不可写；实施期间不尝试提交或覆盖其他已暂存的用户改动。

## Review Focus

1. 问题、人设、域名或系列数据为空/部分缺失时，页面应显示空状态且图表不崩溃（Task 1、4、5、7、8 测试）。
2. 采集设置中禁用平台不能被选中；切换频率后仅显示相应的计划字段（Task 9 测试）。
3. 序列长度不齐、单点序列、空序列或非有限数值不能导致 ECharts 选项出现 `NaN`/`Infinity`（Task 4 测试）。
4. 长德语问题和长域名在320px/200%缩放下仍可读，表格仅局部横向滚动且不会挤坏侧栏（Task 10 浏览器验收）。
5. 切换结果标签后，旧标签打开的详情不能残留或显示错对象（Task 7、8 测试）。

---

## File Structure

```text
src/
  data/visibility-monitoring-data.ts
  views/VisibilityMonitoringView.vue
  components/pages/visibility-monitoring/ # 仅属于可见性监测页面的组件
    MonitoringTrendChart.vue
    MonitoringHeatmapChart.vue
    chart-options.ts
    MonitoringOverview.vue
    SamplingTrustSection.vue
    SamplingRulesPanel.vue
    BrandMentionAnalysis.vue
    QuestionHitDetails.vue
    QuestionDetailDrawer.vue
    SourceDomainTracking.vue
    SourceDetailDrawer.vue
    MonitoringSettingsDialog.vue
  styles/visibility-monitoring.css
```

`VisibilityMonitoringView` owns active result tab, trend mode, selected detail record, and settings-dialog visibility. Overview, brand analysis, question table, and source tracking receive typed data and emit user actions. `chart-options.ts` is pure; the ECharts Vue components own init/resize/dispose only. Demo fixtures do not live inside view components.

页面专属组件统一放在 `src/components/pages/<page-name>/`；跨页面通用组件继续放在 `src/components/` 或 `src/components/ui/ce/`，本次不搬迁既有组件。页面样式参考 `/Users/zhangaichen/Downloads/外部对接样式/external-iframe-style-guide.md` 的语义色、排版、间距、卡片和控件状态；指南中 React/shadcn/Recharts 不改变本项目技术栈。

## Task 1: Define typed demonstration data

**Files:**
- Create: `src/data/visibility-monitoring-data.ts`
- Test: `src/data/visibility-monitoring-data.test.ts`

**Interfaces:**
- Produces exported `VisibilityTab`, `TrendMode`, `SamplingFrequency`, `MonitoringPlatformId`, `MonitoringQuestion`, `TrendSeries`, `HeatmapCell`, `SourceDomain`, `CitedPage`, and `visibilityMonitoringData`.
- `MonitoringQuestion` includes stable `id`, German `question`, `persona`, `platformResults`, `competitors`, `officialSiteCited`, `rank`, `trend`, and detail `samplingBatches`.
- `visibilityMonitoringData` holds overview metrics, 12-week trend series, persona/topic and persona/intent matrices, 10 question rows, platform response details, 5 source domains, cited pages, and settings defaults.

**Acceptance:** Stable IDs, screenshot labels/representative metrics, typed datasets, and finite 12-point series are covered by passing fixture tests.
**Dependencies:** None.
**Estimated scope:** Small (2 files).

- [ ] **Step 1: Write fixture contract tests** for labels, representative totals from screenshots, fixed-size time series, and empty-safe collection shape.

```ts
it('provides twelve weekly points and ten question rows', () => {
  expect(visibilityMonitoringData.weeks).toHaveLength(12)
  expect(visibilityMonitoringData.questions).toHaveLength(10)
  expect(visibilityMonitoringData.questions[0]?.id).toBe('Q01')
})
```

- [ ] **Step 2: Run `npm test -- src/data/visibility-monitoring-data.test.ts` and verify it fails because the module is missing.**
- [ ] **Step 3: Add the exported unions/interfaces and fixture data.** Keep chart labels/colors, questions, persona names, domains, and metric values in this module; use stable IDs and preserve screenshot sample values such as 1,200 observations, 97.4% valid responses, 91% dual-source agreement, and 96.0% review agreement.
- [ ] **Step 4: Re-run the targeted test and verify it passes.** Add assertions that every trend series contains 12 finite values and IDs are unique.

## Task 2: Add the route and onboarding transition

**Files:**
- Modify: `src/router/index.ts`
- Create: `src/views/VisibilityMonitoringView.vue`
- Test: `src/router/visibility-monitoring.test.ts`

**Interfaces:**
- Route name `visibility-monitoring`, path `/visibility-monitoring`, title `可见性监测`, with `requiresOnboarding: true`.

**Acceptance:** The named route resolves to the new view, unfinished onboarding redirects to onboarding, and completed onboarding may access the view.
**Dependencies:** None.
**Estimated scope:** Medium (3 files).

- [ ] **Step 1: Add route tests** asserting route name/path/meta and the existing `requiresOnboarding` redirect behavior for unfinished users.
- [ ] **Step 2: Run `npm test -- src/router/visibility-monitoring.test.ts` and verify it fails on the missing route.**
- [ ] **Step 3: Add the lazy route under `GeoWorkbenchLayout` and create a minimal route view.**
- [ ] **Step 4: Run the targeted route test and `npm run build`; verify route typing and navigation compile.**

## Task 3: Add the workbench navigation and onboarding transition

**Files:**
- Modify: `src/components/GeoSidebar.vue`
- Modify: `src/layouts/GeoWorkbenchLayout.vue`
- Modify: `src/views/OnboardingView.vue`
- Test: `src/views/visibility-monitoring-flow.test.ts`

**Interfaces:**
- Sidebar active-page type is `GeoPage | 'visibility-monitoring'`; the new link targets route name `visibility-monitoring` and has accessible label `可见性监测`.
- On the final onboarding action, call `store.goNext()` once; when it returns `finished`, navigate with `router.push({ name: 'visibility-monitoring' })`.

**Acceptance:** Finishing onboarding navigates to the results route; onboarding remains outside the workbench shell; the visibility nav item is the only active sidebar item on that route.
**Dependencies:** Task 2.
**Estimated scope:** Medium (4 files).

- [ ] **Step 1: Add a flow test** proving the completed final action navigates to the named visibility route and that `/onboarding` renders without the workbench sidebar.
- [ ] **Step 2: Run `npm test -- src/views/visibility-monitoring-flow.test.ts` and verify it fails before the navigation exists.**
- [ ] **Step 3: Update the layout's active-page derivation and sidebar typing/link; update only the final onboarding action to navigate after `goNext()` returns `finished`.** Keep the onboarding route outside `GeoWorkbenchLayout`.
- [ ] **Step 4: Run the targeted test and `npm run build`; verify the active nav item is correct and onboarding remains standalone.**

## Task 4: Build safe, reusable ECharts chart components

**Files:**
- Create: `src/components/pages/visibility-monitoring/chart-options.ts`
- Create: `src/components/pages/visibility-monitoring/chart-options.test.ts`
- Create: `src/components/pages/visibility-monitoring/MonitoringTrendChart.vue`
- Create: `src/components/pages/visibility-monitoring/MonitoringHeatmapChart.vue`

**Interfaces:**
- `createTrendOption(input: { weeks: string[], series: TrendSeries[], showConfidenceBand?: boolean }): EChartsOption`.
- `createHeatmapOption(input: { rows: string[], columns: string[], cells: HeatmapCell[] }): EChartsOption`.
- Chart SFCs accept these inputs through typed props and expose no business-data mutation API.

**Acceptance:** Both chart types render accessible SVG charts, resize/dispose cleanly, and pure option tests cover empty and malformed numeric inputs.
**Dependencies:** Task 1.
**Estimated scope:** Medium (4 files).

- [ ] **Step 1: Write pure option tests** for normal, empty, one-point, mismatched-length, and non-finite-value inputs. Assert options have no non-finite numeric coordinates/data and preserve series labels.
- [ ] **Step 2: Run `npm test -- src/components/pages/visibility-monitoring/chart-options.test.ts` and verify it fails.**
- [ ] **Step 3: Implement option builders** with line/grid/legend/tooltip components and heatmap/visualMap components registered through `echarts/core`; normalize missing points to `null` and exclude invalid values.
- [ ] **Step 4: Implement both SFCs** with `init`, `setOption`, `ResizeObserver`, reduced-motion awareness, `dispose` on unmount, and accessible `role="img"` labels. Skip ECharts initialization under jsdom while retaining the pure option tests.
- [ ] **Step 5: Run the targeted tests and `npm run build`.**

## Task 5: Implement monitoring overview and confidence sections

**Files:**
- Modify: `src/views/VisibilityMonitoringView.vue`
- Create: `src/components/pages/visibility-monitoring/MonitoringOverview.vue`
- Create: `src/components/pages/visibility-monitoring/SamplingTrustSection.vue`
- Create: `src/components/pages/visibility-monitoring/SamplingRulesPanel.vue`
- Test: `src/components/pages/visibility-monitoring/MonitoringOverview.test.ts`

**Interfaces:**
- `MonitoringOverview` accepts the overview object, emits `open-settings`, and displays workflow progress/market/language/active counts.
- `SamplingTrustSection` accepts reliability metrics, trust level, sample summary, personas, and trend data; emits `trust-level-change`.
- `SamplingRulesPanel` accepts the sampling-rule copy and exposes a keyboard-operable disclosure.

**Acceptance:** The default route view shows monitoring summary, overview, confidence/IAB sections, rules disclosure, and an explicit demo-data note.
**Dependencies:** Tasks 1–4.
**Estimated scope:** Medium (5 files).

- [ ] **Step 1: Test overview metric formatting, both trust-level labels, and empty persona handling.**
- [ ] **Step 2: Run the targeted test and verify it fails before components exist.**
- [ ] **Step 3: Implement the route view with page heading, process summary, three result tabs, overview/trust sections, and sampling rules.** The default tab is brand analysis; keep chart filter, selected detail, and dialog state in this view.
- [ ] **Step 4: Render sampling rhythm, confidence cards, IAB coverage checklist, reliability metrics and definitions, with a clear non-live/demo-data disclosure.**
- [ ] **Step 5: Run the targeted test and `npm run build`.**

## Task 6: Implement brand, competitor, persona and intent analysis

**Files:**
- Create: `src/components/pages/visibility-monitoring/BrandMentionAnalysis.vue`
- Create: `src/components/pages/visibility-monitoring/PersonaTopicHeatmap.vue`
- Create: `src/components/pages/visibility-monitoring/PersonaIntentHeatmap.vue`
- Test: `src/components/pages/visibility-monitoring/brand-analysis.test.ts`

**Interfaces:**
- `BrandMentionAnalysis` accepts 12-week series, competitor metrics, topic matrix, and intent matrix; accepts `modelValue: TrendMode`; emits `update:modelValue`.
- Heatmap components accept typed rows/cells and render via `MonitoringHeatmapChart`.

**Acceptance:** All four trend modes switch their series; competitor cards and both heatmaps display correct legends and render empty data safely.
**Dependencies:** Tasks 1, 4, and 5.
**Estimated scope:** Medium (4 files).

- [ ] **Step 1: Test the four trend-mode labels, selected state, and empty matrix/competitor behavior.**
- [ ] **Step 2: Run the targeted test and verify it fails.**
- [ ] **Step 3: Implement trend-mode controls** for overall+confidence interval, AI engine, buyer persona, and brand-vs-competitor. Map each selection to the corresponding fixture series and show a mode-specific chart legend/caption.
- [ ] **Step 4: Add competitor comparison cards, buyer-persona × core-topic matrix, buyer-persona × purchase-intent/stage matrix, and the legend for strong/good/weak/gap ranges.**
- [ ] **Step 5: Run targeted tests and `npm run build`.**

## Task 7: Implement Q&A hit table and question details

**Files:**
- Create: `src/components/pages/visibility-monitoring/QuestionHitDetails.vue`
- Create: `src/components/pages/visibility-monitoring/QuestionDetailDrawer.vue`
- Create: `src/components/pages/visibility-monitoring/question-view-model.ts`
- Test: `src/components/pages/visibility-monitoring/question-view-model.test.ts`

**Interfaces:**
- `getQuestionSummary(question: MonitoringQuestion): QuestionSummary` returns platform hits, own-brand mention rate, citation rate, average rank, sentiment counts, competitor list, and sample confidence data.
- `QuestionSummary` fields are `platformHits: number`, `ownMentionRate: number`, `citationRate: number`, `averageRank: number | null`, `sentiment: { positive: number, neutral: number, negative: number }`, `competitors: string[]`, and `confidenceInterval: number | null`.
- `QuestionHitDetails` accepts questions, emits `select-question(questionId)`; `QuestionDetailDrawer` accepts `question: MonitoringQuestion | null`, `open`, and emits `close`.

**Acceptance:** Question rows, detail metrics, sampling batches, citation details, platform responses, and tab-reset behavior work with complete or partial records.
**Dependencies:** Tasks 1, 4, and 5.
**Estimated scope:** Medium (4 files).

- [ ] **Step 1: Test summary counts/percentages, no-rank handling, missing platform responses, and empty sampling batches.**
- [ ] **Step 2: Run the targeted test and verify it fails.**
- [ ] **Step 3: Implement the Q&A table** with platform mentions, competitor mentions, official-site citation, rank, trend, persona, and accessible details action. Use a horizontally scrollable table container for narrow viewports.
- [ ] **Step 4: Implement the question drawer** with performance cards, sampling batches, 95% interval, brand mention/citation tables, cited pages, mention trend chart, and expandable per-platform response rows.
- [ ] **Step 5: Reset/close the selected question when leaving this result tab; test that a stale question is not rendered after tab switch.**
- [ ] **Step 6: Run targeted tests and `npm run build`.**

## Task 8: Implement source-domain tracking and detail panel

**Files:**
- Create: `src/components/pages/visibility-monitoring/SourceDomainTracking.vue`
- Create: `src/components/pages/visibility-monitoring/SourceDetailDrawer.vue`
- Create: `src/components/pages/visibility-monitoring/source-view-model.ts`
- Test: `src/components/pages/visibility-monitoring/source-view-model.test.ts`

**Interfaces:**
- `getSourceSummary(source: SourceDomain): SourceSummary` computes associated platform labels, whether own brand appears, and competitor citation labels.
- `SourceSummary` fields are `platforms: MonitoringPlatformId[]`, `ownBrandMentioned: boolean`, and `competitors: string[]`.
- `SourceDomainTracking` accepts domains/pages and emits `select-source(sourceId)`; `SourceDetailDrawer` accepts `source: SourceDomain | null`, `open`, and emits `close`.

**Acceptance:** Domain/page tables show citation metrics and associations; source details open/close correctly and empty source data remains safe.
**Dependencies:** Tasks 1 and 4.
**Estimated scope:** Medium (4 files).

- [ ] **Step 1: Test domain sorting/count display, missing source flags, and empty cited-page data.**
- [ ] **Step 2: Run the targeted test and verify it fails.**
- [ ] **Step 3: Implement source-domain and cited-page tables** with counts, AI platforms, own-brand/competitor status, summaries, and detail actions; keep long domains and titles readable in a scrollable table.
- [ ] **Step 4: Implement the source detail panel** with citation totals, linked questions, platforms, and cited-page summaries. Close/reset the selected source when leaving the tab.
- [ ] **Step 5: Run targeted tests and `npm run build`.**

## Task 9: Implement monitoring frequency/platform settings

**Files:**
- Create: `src/components/pages/visibility-monitoring/MonitoringSettingsDialog.vue`
- Create: `src/components/pages/visibility-monitoring/MonitoringSettingsDialog.test.ts`
- Modify: `src/views/VisibilityMonitoringView.vue`
- Modify: `src/components/pages/visibility-monitoring/MonitoringOverview.vue`

**Interfaces:**
- `MonitoringSettingsDialog` accepts `open`, `frequency: SamplingFrequency`, `platforms: MonitoringPlatformId[]`; emits `close` and `save({ frequency, platforms })`.
- View updates local demo settings only after save; cancel/escape leaves prior settings unchanged.

**Acceptance:** Weekly/monthly/quarterly controls work, disabled platforms stay disabled, save updates summary, and cancel preserves prior settings.
**Dependencies:** Tasks 1 and 5.
**Estimated scope:** Medium (4 files).

- [ ] **Step 1: Test defaults, all frequency options, enabled/disabled platforms, weekly day/time fields, modal cancel, and save payload.**
- [ ] **Step 2: Run the targeted test and verify it fails.**
- [ ] **Step 3: Implement the dialog using existing CE dialog/input/select/button components.** Keep disabled platforms unselectable, expose labels and focus behavior, and show that market/persona/questions use the current plan.
- [ ] **Step 4: Wire the overview action to open the dialog and apply saved values to its displayed sampling rhythm/platform count.**
- [ ] **Step 5: Run targeted tests and `npm run build`.**

## Task 10: Integrate, tune responsive layout, and verify end-to-end

**Files:**
- Modify: `src/views/VisibilityMonitoringView.vue`
- Modify: `src/styles/visibility-monitoring.css`
- Test: `src/views/visibility-monitoring-integration.test.ts`

**Acceptance:** All screenshot sections are integrated; responsive tables/drawers and route flow work; test, lint, build, browser smoke checks pass.
**Dependencies:** Tasks 1–9.
**Estimated scope:** Small (3 files, plus browser verification).

- [ ] **Step 1: Integrate all three result tabs** and ensure each component uses the shared fixtures and typed contracts.
- [ ] **Step 2: Add responsive rules** for 3-column metrics, comparison cards, heatmaps, tables, chart controls, and drawers. At ≤760px use 16px page side padding and single-column layouts; at ≤520px use 16px card padding. Preserve one outer vertical scroll and local table horizontal scrolling; verify content widths 1280px, 1024px, 760px, 520px, and 320px plus 200% zoom.
- [ ] **Step 3: Run `npm test`, `npm run lint`, and `npm run build`; resolve regressions without changing unrelated onboarding edits.**
- [ ] **Step 4: Run a browser smoke test**: verify onboarding has no sidebar; final CTA navigates to `/visibility-monitoring`; sidebar label/highlight is correct; direct visit redirects when onboarding is incomplete; tabs, each trend mode, chart tooltips, settings save/cancel, question detail, cited page, source detail, and disclosure controls work.
- [ ] **Step 5: Inspect console errors and screenshots at desktop, 320px content width, and 200% zoom; correct layout, focus, contrast, scroll nesting, or overflow issues.**

## Verification Checkpoints

### After Tasks 1–3: data and entry flow

- [ ] Focused data and route/flow tests pass.
- [ ] `npm run build` passes.
- [ ] Onboarding remains standalone; the result route is protected and the workbench link highlights correctly.

### After Tasks 4–6: charts and overview/brand analysis

- [ ] Chart option, overview, and brand-analysis tests pass.
- [ ] `npm run build` passes.
- [ ] Overview and all brand analysis modes render from the shared demo-data module.

### After Tasks 7–9: details and configuration

- [ ] Question, source, and settings tests pass.
- [ ] `npm run build` passes.
- [ ] Detail panels and settings save/cancel are connected to their owning tabs/summary.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Many screenshot regions could become one oversized route component | High | Keep one component per analysis region and move demo content/types into the shared data module. |
| ECharts initialization can fail on empty/partial data or hidden container sizes | Medium | Test pure option builders and use resize observer plus empty-safe options. |
| German question/domain text can overflow dense tables | Medium | Add scroll containers and verify at 1280px, 1024px, and 768px. |
| Existing staged onboarding work could be disturbed | High | Limit edits to listed files, inspect diffs before changing shared files, and do not stage/commit unrelated changes. |

## Open Questions

- None blocking; screenshots and approved design specify the page scope. Real API integration is explicitly outside this first implementation.

---

## Task Checklist

See `tasks/todo.md` for the concise execution checklist.

