# 全站 SVG 图标统一实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一全站界面图标为一致、可访问且按需打包的 Lucide SVG，同时保持 CE 组件既有公开接口兼容。

**Architecture:** 增加静态命名导入的语义图标注册表和 `AppIcon` Vue 组件；应用页面改用语义图标名，CE 的旧 `IconFont`/`iconType` 接口暂时由映射适配器保留。按公共组件、共享页面、业务域分批替换，保留旗帜、品牌图形、图表数据图形和正文中的符号。

**Tech Stack:** Vue 3 `<script setup lang="ts">`、TypeScript、`@lucide/vue`、Vitest、Vite。

**Spec:** `docs/superpowers/specs/2026-10-13-project-svg-icon-system-design.md`

## Global Constraints

- 采用 Lucide 的 Vue SVG 组件，官方当前 Vue 包名为 `@lucide/vue`。
- 仅通过命名导入实际使用的图标，禁止使用导入整个图标命名空间的方式。
- 对外以项目语义名称表达图标用途，不在页面重复引用图标库内部命名。
- 装饰图标默认对辅助技术隐藏；没有可见文字且图标承担操作名称时，调用方提供无障碍名称。
- 国家/地区旗帜、品牌标志和产品专属插画保留；ECharts 或自定义图表中的数据图形、坐标、曲线和装饰性数据标记保留。
- 正文、用户内容、算式及流程说明文案中的箭头、乘号等文本符号保留；有明确数字含义的步骤序号保留。
- 既有 UI 组件导出和 `iconType` props 不发生未经确认的破坏性变更。

## Review Focus

- 未登记或过期的旧 `iconType`：兼容适配器应保持可见 fallback，并在开发期给出诊断；Task 2 添加测试。
- 纯图标按钮没有可见文字：仍需有可访问名称，图标不能覆盖按钮原有 label；Task 2 添加测试。
- 字符箭头同时用于 UI 操作和正文描述：只替换操作图标，正文内容不变；Task 4/5 添加定向测试。
- SVG 在 CE iframe 内渲染：图标仍继承 `currentColor`，尺寸/描边不依赖宿主页面 CSS；Task 1 和 Task 2 添加组件测试。
- 国家旗帜、品牌标记和图表 SVG：迁移扫描不能误删或替换；Task 6 添加保留项回归检查。

---

## 文件结构与职责

- Create `src/components/ui/icons/AppIcon.vue`: 接收语义 `name`、可选 `size`/`strokeWidth` 和可访问名称；统一渲染 Lucide Vue component。
- Create `src/components/ui/icons/icon-registry.ts`: 静态导入图标，导出 `AppIconName` 联合类型、语义 registry 和旧 IconFont 名称映射。
- Create `src/components/ui/icons/AppIcon.test.ts`: 验证渲染、默认视觉 props、装饰/有标签的 ARIA 行为以及旧名称映射。
- Modify `src/components/ui/ce/icon-font/IconFont.vue`: 保持现有 props/attrs 外观，把旧 `type` 名转成语义名后委托给 `AppIcon`；未知值使用兼容 fallback 并仅在开发期诊断。
- Modify `src/components/ui/ce/button/Button.vue`, `src/components/ui/ce/alert/Alert.vue`, `src/components/ui/ce/modal/MessageModal.vue`, `src/components/ui/ce/content-preview/ContentPreview.vue`: 逐步改用 AppIcon 或保留 iconType API 的适配层。
- Modify `src/components/ui/ce/index.ts` and `src/components/ui/ce/component-manifest.ts`: 保留既有导出及依赖声明；只有在公共 API 测试确认兼容后才更新实现来源。
- Modify existing Vue feature files listed in Tasks 3–5; add or extend colocated Vitest tests for semantic and exclusion behavior.
- Modify `package.json` and `package-lock.json`: add the Vue icon package and lock the resolved version.

## Task 1: Add the typed SVG icon entry and registry

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/components/ui/icons/icon-registry.ts`
- Create: `src/components/ui/icons/AppIcon.vue`
- Test: `src/components/ui/icons/AppIcon.test.ts`

**Interfaces:**
- Produces: `AppIconName`, a union of static semantic registry keys; `AppIcon.vue` props `{ name: AppIconName; size?: number | string; strokeWidth?: number; ariaLabel?: string }`.
- `ariaLabel` present means `role="img"` and accessible label; absent means `aria-hidden="true"`.
- Registry imports only named icons from `@lucide/vue`; no `import * as icons`.

- [x] **Step 1: Add failing AppIcon component tests** for rendering one semantic name, receiving `size` and `strokeWidth`, default decorative hiding, and accessible labeling when `ariaLabel` is provided.
- [x] **Step 1a: Capture the current production bundle baseline** before adding the dependency. Run the existing build and record each emitted JS/CSS asset's raw and gzip size; keep the measurements in the implementation summary.
- [x] **Step 2: Run the focused test and confirm it fails** because the registry/component does not exist.

Run: `npx vitest run src/components/ui/icons/AppIcon.test.ts`

Expected: FAIL with module/component not found.

- [x] **Step 3: Add `@lucide/vue` and implement the static registry plus AppIcon.** Use explicit named imports for the initial icon set: `ArrowLeft`, `ArrowRight`, `ChevronDown`, `ChevronRight`, `X`, `Plus`, `Search`, `Upload`, `Check`, `CircleCheck`, `Info`, `TriangleAlert`, `ExternalLink`, `ArrowUpRight`, `ArrowUp`, and `ArrowDown`; add names only when a migration task needs them. Set defaults to `size=18`, `strokeWidth=2`, `color="currentColor"` via the SVG component props.
- [x] **Step 4: Rerun AppIcon tests and verify the expected accessible tree.**

Run: `npx vitest run src/components/ui/icons/AppIcon.test.ts`

Expected: PASS; aria-label only exists for labeled icon graphics, decorative graphics are hidden.

- [x] **Step 5: Run TypeScript build to ensure public props and registry inference are correct.**

Run: `npm run build`

Expected: PASS.

## Task 2: Migrate CE icon consumers without breaking their public API

**Files:**
- Modify: `src/components/ui/ce/icon-font/IconFont.vue`, `src/components/ui/ce/icon-font/types.ts`
- Modify: `src/components/ui/ce/button/Button.vue`, `src/components/ui/ce/alert/Alert.vue`, `src/components/ui/ce/modal/MessageModal.vue`, `src/components/ui/ce/content-preview/ContentPreview.vue`
- Modify only if needed: `src/components/ui/ce/index.ts`, `src/components/ui/ce/component-manifest.ts`
- Test: create `src/components/ui/ce/icon-font/IconFont.test.ts`, `src/components/ui/ce/button/Button.test.ts`, and `src/components/ui/ce/alert/Alert.test.ts` if absent; retain `src/components/ui/ce/modal/Modal.test.ts`

**Interfaces:**
- Consumes: Task 1 `AppIconName` and semantic registry.
- Produces: existing `IconFont` export and existing `iconType`/`type` string props remain callable by current consumers; known legacy values map to semantic SVG names.

- [x] **Step 1: Add failing compatibility tests** for known names `icon-a-arrowleft`, `icon-a-arrowright`, `icon-xinxi`, `icon-wancheng-1`, `icon-tishi`, `icon-icon-center-16px`, and `icon-guanbi`; verify each renders one SVG and retains passed-through attrs. Add assertions that Button labels remain visible, Alert keeps its tone class, and MessageModal's close action retains its accessible name.
- [x] **Step 2: Add a failing unknown-name test** asserting unknown names render a non-empty neutral fallback and do not crash the CE consumer.
- [x] **Step 3: Run the focused compatibility tests and confirm failure** before changing IconFont.

Run: `npx vitest run src/components/ui/ce/icon-font/IconFont.test.ts`

Expected: FAIL on missing SVG mapping/implementation.

- [x] **Step 4: Implement the legacy-name map in `icon-registry.ts` and delegate IconFont to AppIcon.** Keep its `type`, `size`, `color`, and `spin` behavior; log a one-time warning for unknown legacy names only in development.
- [x] **Step 5: Update Button, Alert, MessageModal, and ContentPreview internals** to pass semantic icons through the adapter while preserving public props, button labels, alert tone colors, and close behavior.
- [x] **Step 6: Run focused tests for the CE icon wrapper and its consumers.**

Run: `npx vitest run src/components/ui/ce/icon-font/IconFont.test.ts src/components/ui/ce/button/Button.test.ts src/components/ui/ce/alert/Alert.test.ts src/components/ui/ce/modal/Modal.test.ts`

Expected: PASS; existing modal tests continue to pass and public icon props remain unchanged.

## Task 3: Replace shared navigation and foundational control icons

**Files:**
- Modify: `src/components/market/MarketSwitcher.vue`, `src/layouts/GeoWorkbenchLayout.vue`
- Modify: `src/components/ui/ce/chevron-icon/ChevronIcon.vue`, `src/components/ui/ce/direction-arrow/DirectionArrow.vue`, `src/components/ui/ce/dropdown-select/DropdownSelect.vue`, `src/components/ui/ce/modal/Modal.vue`, `src/components/ui/Stepper.vue`
- Test: create `src/components/market/MarketSwitcher.test.ts`, `src/components/ui/Stepper.test.ts`, and `src/layouts/GeoWorkbenchLayout.test.ts` if absent; retain `src/components/ui/ce/modal/Modal.test.ts`.

**Interfaces:**
- Consumes: Task 1 `AppIcon` and Task 2 legacy compatibility API.
- Produces: visually consistent navigation/control icons; all buttons retain existing visible text and accessible names.

- [x] **Step 1: Add/extend tests for icon semantics**: market add action renders a plus SVG, market selector renders a chevron SVG, modal close stays labeled, stepper check is decorative while step numbers stay text, and layout route explanation copy is unchanged.
- [x] **Step 2: Run focused tests and confirm new assertions fail** on current character/custom SVG renderings.

Run: `npx vitest run src/components/market/MarketSwitcher.test.ts src/components/ui/ce/modal/Modal.test.ts src/components/ui/Stepper.test.ts src/layouts/GeoWorkbenchLayout.test.ts`

Expected: new icon assertions FAIL before migration; existing behavior tests remain green.

- [x] **Step 3: Replace only interface icons with AppIcon.** Leave any explanatory arrows or symbol values inside prose untouched.
- [ ] **Step 4: Run focused tests and inspect one shared shell screen at desktop and narrow viewport.** (Tests pass; screenshot-level inspection is unavailable in this session.)

Run: `npx vitest run src/components/market/MarketSwitcher.test.ts src/components/ui/ce/modal/Modal.test.ts src/components/ui/Stepper.test.ts src/layouts/GeoWorkbenchLayout.test.ts`

Expected: PASS; controls align to current text baseline and inherit semantic color.

## Task 4: Migrate task workflow, upload, diagnosis, and optimization icons

**Files:**
- Modify: `src/components/tasks/TaskWorkspace.vue`, `src/components/tasks/KnowledgeUploadDrawer.vue`, `src/components/tasks/TaskProgressTimeline.vue`
- Modify: `src/components/workbench/diagnosis/DiagnosisContent.vue`, `src/components/workbench/diagnosis/PersonaGapCard.vue`, `src/components/workbench/optimization/OptimizationContent.vue`
- Test: extend `src/components/tasks/TaskWorkspace.test.ts`, `src/components/tasks/KnowledgeUploadDrawer.test.ts`, and `src/components/workbench/optimization/OptimizationContent.test.ts`; create `src/components/workbench/diagnosis/DiagnosisContent.test.ts` and `PersonaGapCard.test.ts` if absent.

**Interfaces:**
- Consumes: Task 1 `AppIcon` semantic names.
- Produces: upload, check, warning, external-link, timeline, and interface navigation graphics rendered as SVG; task flow copy and visible status text remain unchanged.

- [x] **Step 1: Add tests for upload icon render, completion/check and warning state, plus diagnosis external-link arrow.** Assert the upload input remains operable, and preserve any workflow phrase such as `P0 → P1 → P2` as text if present in rendered copy.
- [ ] **Step 2: Run focused tests to confirm icon assertions fail while existing task/upload behavior remains intact.** (The focused suites were run after implementation; no pre-change RED result was captured for this batch.)

Run: `npx vitest run src/components/tasks src/components/workbench/diagnosis src/components/workbench/optimization`

Expected: new assertions FAIL before migration; prior workflow tests remain green.

- [x] **Step 3: Replace interface-only glyphs/custom arrows in the listed components** with named AppIcon entries; preserve `aria-hidden`, status text, inline links, and disabled states.
- [ ] **Step 4: Run focused task and workbench tests and visually inspect Brief, upload drawer, and diagnosis screens.** (Tests pass; screenshot-level inspection is unavailable in this session.)

Run: `npx vitest run src/components/tasks src/components/workbench/diagnosis src/components/workbench/optimization`

Expected: PASS; no click target or layout changes beyond icon appearance.

## Task 5: Migrate overview, reports, and onboarding knowledge icons

**Files:**
- Modify: `src/components/overview/AgentWorkQueue.vue`, `src/components/overview/PlatformPerformance.vue`, `src/components/report-center/LatestReportCard.vue`, `src/components/report-center/ReportListPanel.vue`, `src/components/report-center/ReportPreviewDrawer.vue`
- Modify: `src/components/onboarding/knowledge/CompetitorKnowledgePanel.vue`, `src/components/onboarding/knowledge/ProductKnowledgePanel.vue`, `src/views/MarketSetupView.vue`
- Modify: `src/components/onboarding/monitoring-questions/MonitoringQuestionStep.vue`, `src/components/onboarding/monitoring-plan/MonitoringPlanStep.vue`, `src/components/onboarding/buyer-persona/BuyerPersonaEditorDialog.vue`, `src/components/overview/OverviewInfoIcon.vue`
- Test: extend `src/components/overview/AgentWorkQueue.test.ts`, `src/components/overview/PlatformPerformance.test.ts`, `src/components/report-center/ReportListPanel.test.ts`, `src/components/report-center/ReportPreviewDrawer.test.ts`, `src/components/onboarding/knowledge/KnowledgeEditorDialog.test.ts`, `src/components/onboarding/monitoring-questions/MonitoringQuestionStep.test.ts`, `src/components/onboarding/monitoring-plan/MonitoringPlanStep.test.ts`, and `src/components/onboarding/buyer-persona/BuyerPersonaStep.test.ts`; create `src/views/MarketSetupView.test.ts`; add `LatestReportCard.test.ts`, `CompetitorKnowledgePanel.test.ts`, and `ProductKnowledgePanel.test.ts` only if targeted icon behavior is not already covered.

**Interfaces:**
- Consumes: Task 1 `AppIcon` semantic names.
- Produces: consistent SVG action/status icons across remaining product pages while preserving text, data values, status labels, and market flags.

- [x] **Step 1: Add targeted tests** for success/pending report status, onboarding add actions, and onboarding step/check status.
- [ ] **Step 2: Run affected tests and confirm new icon-specific assertions fail before replacement.** (The affected suites were run after implementation; no pre-change RED result was captured for this batch.)

Run: `npx vitest run src/components/overview src/components/report-center src/components/onboarding src/views/MarketSetupView.test.ts`

Expected: new assertions FAIL before migration; existing data/workflow assertions remain green.

- [x] **Step 3: Replace decorative interface marks with AppIcon, using `currentColor`/semantic CSS tokens**; retain text-based trend direction where the word `上升/下降/持平` already conveys meaning.
- [ ] **Step 4: Run affected tests and visually inspect overview, reports, onboarding, and monitoring at desktop and narrow widths.** (Tests pass; screenshot-level inspection is unavailable in this session.)

Run: `npx vitest run src/components/overview src/components/report-center src/components/onboarding src/views/MarketSetupView.test.ts`

Expected: PASS; market flags, chart graphics, metric values, and existing copy are unchanged.

## Task 6: Migrate visibility monitoring icons

**Files:**
- Modify: `src/components/visibility-monitoring/questions/QuestionDetailDrawer.vue`, `src/components/visibility-monitoring/questions/QuestionHitDetails.vue`, `src/components/visibility-monitoring/sampling/SamplingTrustSection.vue`, `src/components/visibility-monitoring/settings/MonitoringProcessNav.vue`, `src/components/visibility-monitoring/settings/MonitoringSettingsDialog.vue`
- Test: extend `src/components/visibility-monitoring/questions/QuestionDetailDrawer.test.ts` and `src/components/visibility-monitoring/settings/MonitoringSettingsDialog.test.ts`; add a colocated test only if a migrated action/status has no existing coverage.

**Interfaces:**
- Consumes: Task 1 `AppIcon` semantic names.
- Produces: SVG interface and status icons while preserving trend meaning, existing prose, market flags, and data graphics.

- [x] **Step 1: Add tests** for process-nav active/check state and question drawer action icons; assert `上升/下降/持平` text and data-chart output remain unchanged.
- [ ] **Step 2: Run the existing monitoring tests and confirm the new SVG assertions fail before migration.** (The monitoring suite was run after implementation; no pre-change RED result was captured for this batch.)

Run: `npx vitest run src/components/visibility-monitoring`

Expected: new assertions FAIL before replacement; current monitoring behavior tests remain green.

- [x] **Step 3: Replace only interface icons with `AppIcon`;** do not change charts, flags, or text-based trend indicators.
- [ ] **Step 4: Rerun monitoring tests and inspect the settings and question drawers at desktop and narrow widths.** (Tests pass; screenshot-level inspection is unavailable in this session.)

Run: `npx vitest run src/components/visibility-monitoring`

Expected: PASS; status meaning and chart output are unchanged.

## Task 7: Audit scope, compatibility, accessibility, and bundle impact

**Files:**
- Review: all `src/**/*.vue`, `src/components/ui/ce/index.ts`, `src/components/ui/ce/component-manifest.ts`
- Test: all existing test suites; update only icon-specific assertions.
- Do not modify: chart SVG/data logic, country flag rendering/assets, brand logos, prose/data glyphs excluded by the spec.

**Interfaces:**
- Consumes: Tasks 1–6 complete semantic registry and migration.
- Produces: verified full-site icon migration report with before/after production asset sizes.

- [x] **Step 1: Scan for residual icon-font call sites, raw interface glyphs, and direct icon SVGs.** Classify each remaining match as intentional (flag/chart/brand/prose/data) or migrate it; record the intentional exclusions in the change summary.
- [x] **Step 2: Confirm public compatibility** by running tests for Button, Alert, MessageModal, ContentPreview, and `IconFont` aliases; check unknown aliases produce fallback instead of blank output.
- [x] **Step 3: Run the full test suite, lint, and production build.**

Run: `npm test && npm run lint && npm run build`

Expected: all tests, lint, type-check, and Vite build pass.

- [x] **Step 4: Compare `dist/assets/*.js` and `*.css` sizes** against a clean pre-change build, using the same build command and gzip measurement; report the raw and gzip deltas. Confirm only the imported registry icons are present and no whole-namespace icon import was emitted.
- [ ] **Step 5: Visually check representative routes** at 320px, 768px, 1024px, and 1440px: overview, task brief/upload, diagnosis, report center, onboarding, and visibility monitoring; verify no clipping, shifted button baselines, or lost icon labels.
- [x] **Step 6: Review the final diff** and ensure unrelated user changes remain untouched; do not combine unrelated workspace files in a commit.

