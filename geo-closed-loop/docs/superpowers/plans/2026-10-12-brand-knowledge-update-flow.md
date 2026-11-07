# 品牌知识更新流程实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按用户截图实现品牌知识更新、各市场推荐题处理和统一开启的完整前端流程，并以视觉完成度作为首要验收标准。

**Architecture:** 类型化流程 service 提供 mock 实现，流程容器协调品牌知识编辑、影响确认和市场列表；单市场推荐题选择嵌入现有“监测问题”阶段，避免把主流程做成一个巨大弹窗。流程状态只从 service 读取/提交，不写入 localStorage；确认、列表和候选面板使用独立组件，页面视图只负责连接入口与阶段。

**Tech Stack:** Vue 3 `<script setup lang="ts">`、Pinia 当前知识 store、CE Modal/Button、Vitest + Vue Test Utils、Vite。

**Spec:** `docs/superpowers/specs/2026-10-12-brand-knowledge-update-flow-design.md`

## Global Constraints

- 后端是市场状态、处理进度、推荐题和修改次数的唯一事实来源；本期使用类型化 mock service，不接真实 API。
- 前端不将暂停、生成、已选或已处理状态写入 localStorage。
- 用户确认后才提交知识更新、暂停市场和生成推荐题；接口失败不得显示成功。
- 单市场最多选择 5 条推荐题；只加入已选推荐题，保留已有问题，未选候选不加入。
- 流程视觉完成度是首要验收标准；整体精致、克制、紧凑、易扫读，避免弹窗过宽/过高、按钮或标题过大、留白失衡。
- 使用现有 GEO 工作台基线、项目语义 tokens 和一致的字号、间距、控件高度、圆角、边框、阴影；不得为了交付降低视觉标准。

## Review Focus

- 取消影响确认不得更改知识、暂停市场或生成候选；编辑草稿必须保留。Test in Task 4: cancel confirmation and reopen it; assert original draft remains and mock service mutation methods were not called.
- 确认、市场保存、统一开启中的重复点击或失败不能造成重复副作用或错误成功态。Test in Tasks 1 and 4: use deferred/rejected promises; assert one operation at a time, no premature transition, retained selection and retry.
- 空市场列表、零候选和无可用修改次数必须给出有意义的空/不可提交状态。Test in Tasks 1–2: fixtures with zero markets, zero candidates and zero remaining edits.
- 候选重复、过期 ID 或超过 5 条的选择不得破坏既有问题或越过上限。Test in Tasks 1 and 3: duplicate and unknown IDs are ignored/rejected; selection remains at most five; current questions remain unchanged except selected new IDs.
- 长德语问题、窄视口和较长市场名称不得造成横向溢出或弹窗比例失衡。Test in Task 5: browser screenshots at 1440×900 and 375×812, verify no page-level horizontal scroll and visually inspect proportions/line wrapping.

---

## File Map

**Create**

- `src/components/visibility-monitoring/settings/brand-knowledge-update/types.ts` — 流程快照、影响摘要、市场推荐状态和 service 类型。
- `src/components/visibility-monitoring/settings/brand-knowledge-update/mock-service.ts` — 确定性 mock 数据及流程操作。
- `src/components/visibility-monitoring/settings/brand-knowledge-update/mock-service.test.ts` — service 状态迁移与边界测试。
- `src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeChangeConfirm.vue` — 品牌修改影响范围确认弹窗。
- `src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeChangeConfirm.test.ts` — 展示、取消、处理中和零额度状态测试。
- `src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationListDialog.vue` — 各市场状态/待处理量列表及统一开启操作。
- `src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationListDialog.test.ts` — 市场状态、空状态、事件和 loading/error 测试。
- `src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationEditor.vue` — 单市场候选选择与当前监测问题展示。
- `src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationEditor.test.ts` — 5 条上限、保留已有问题、选择态和保存事件测试。
- `src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeUpdateFlow.vue` — service orchestration、知识编辑器握手和弹窗步骤状态。
- `src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeUpdateFlow.test.ts` — 端到端组件步骤、取消、错误重试与状态刷新测试。

**Modify**

- `src/components/onboarding/knowledge/KnowledgeEditorDialog.vue` — 增加受控的保存行为，供本流程暂存有效草稿并等待影响确认；默认保存/关闭行为保持现状。
- `src/components/onboarding/knowledge/KnowledgeEditorDialog.test.ts` — 新建测试，覆盖默认保存/关闭行为和新受控保存模式。
- `src/components/visibility-monitoring/settings/MonitoringSetupStage.vue` — 在监测问题阶段按需显示单市场推荐编辑面板，保存/返回通过事件交给流程容器。
- `src/views/VisibilityMonitoringView.vue` — 将品牌知识维护入口连接至流程容器，切换到监测问题阶段并提供返回市场列表入口。
- `src/views/visibility-monitoring-integration.test.ts` — 覆盖从入口到市场处理再返回的页面级连接。

## Task 1: 建立类型化流程 service 和确定性 mock

**Files:**
- Create: `src/components/visibility-monitoring/settings/brand-knowledge-update/types.ts`
- Create: `src/components/visibility-monitoring/settings/brand-knowledge-update/mock-service.ts`
- Test: `src/components/visibility-monitoring/settings/brand-knowledge-update/mock-service.test.ts`

**Interfaces:**
- `BrandKnowledgeUpdateService.getSnapshot(): Promise<BrandKnowledgeUpdateSnapshot>`
- `BrandKnowledgeUpdateService.previewChange(items: KnowledgeItem[]): Promise<BrandKnowledgeChangeImpact>`
- `BrandKnowledgeUpdateService.confirmChange(items: KnowledgeItem[]): Promise<BrandKnowledgeUpdateSnapshot>`
- `BrandKnowledgeUpdateService.saveMarketSelection(marketId: string, candidateIds: string[]): Promise<BrandKnowledgeUpdateSnapshot>`
- `BrandKnowledgeUpdateService.enableAllMarkets(): Promise<BrandKnowledgeUpdateSnapshot>`
- `createMockBrandKnowledgeUpdateService(seed?: BrandKnowledgeUpdateSnapshot): BrandKnowledgeUpdateService`

- [ ] **Step 1: Write failing service tests** for preview having no side effects; confirmation pausing enabled markets and producing candidates; market save adding selected candidates while retaining current questions; enable-all updating every market; zero markets, no candidates, stale IDs and selection limit.
- [ ] **Step 2: Run the targeted test and verify it fails**

  Run: `npx vitest run src/components/visibility-monitoring/settings/brand-knowledge-update/mock-service.test.ts`

  Expected: FAIL because the service types/module do not exist.
- [ ] **Step 3: Add the minimal domain types and mock service**. Keep state in the service instance only (no browser storage); return cloned data so callers cannot mutate service state accidentally. Provide three markets and localized candidate questions matching the screenshots; label the fixture as demo data.
- [ ] **Step 4: Run the targeted service test**

  Run: `npx vitest run src/components/visibility-monitoring/settings/brand-knowledge-update/mock-service.test.ts`

  Expected: PASS, including confirmation with no active markets and rejection of more than five or unknown candidate IDs.
- [ ] **Step 5: Commit**

  ```bash
  git add src/components/visibility-monitoring/settings/brand-knowledge-update/types.ts src/components/visibility-monitoring/settings/brand-knowledge-update/mock-service.ts src/components/visibility-monitoring/settings/brand-knowledge-update/mock-service.test.ts
  git commit -m "feat: add brand knowledge update mock service"
  ```

## Task 2: Build polished confirmation and market-list dialogs

**Files:**
- Create: `src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeChangeConfirm.vue`
- Create: `src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeChangeConfirm.test.ts`
- Create: `src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationListDialog.vue`
- Create: `src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationListDialog.test.ts`

**Interfaces:**
- `BrandKnowledgeChangeConfirm` props: `open`, `impact`, `pending`; emits `back`, `confirm`.
- `MarketRecommendationListDialog` props: `open`, `snapshot`, `pendingAction`, `error`; emits `processMarket(marketId)`, `enableAll`, `close`, `retry`.

- [ ] **Step 1: Write failing component tests** for impact scope/counts, return-to-edit and confirm events, zero remaining edits, market cards with status/pending counts, empty state, pending disablement and retry presentation.
- [ ] **Step 2: Run both targeted tests and verify they fail**

  Run: `npx vitest run src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeChangeConfirm.test.ts src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationListDialog.test.ts`

  Expected: FAIL because components do not exist.
- [ ] **Step 3: Implement both components** with the existing CE `Modal` and `Button`, semantic tokens, measured content-fit widths and compact hierarchy. Use one clear primary action, a quieter back/close action, readable status labels, no oversized heading/footer controls, and no unnecessary nested card borders.
- [ ] **Step 4: Run both targeted tests**

  Run: `npx vitest run src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeChangeConfirm.test.ts src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationListDialog.test.ts`

  Expected: PASS; assert labels/content and accessible roles rather than implementation-only class structure.
- [ ] **Step 5: Commit**

  ```bash
  git add src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeChangeConfirm.vue src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeChangeConfirm.test.ts src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationListDialog.vue src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationListDialog.test.ts
  git commit -m "feat: add brand update confirmation and market list"
  ```

## Task 3: Build the market recommendation editor

**Files:**
- Create: `src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationEditor.vue`
- Create: `src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationEditor.test.ts`

**Interfaces:**
- Props: `market: MarketRecommendationState`, `selectedIds: string[]`, `pending: boolean`.
- Emits: `update:selectedIds(ids: string[])`, `save`, `returnToMarkets`.

- [ ] **Step 1: Write failing tests**: candidate checkbox toggling, visible `n / 5` count, sixth candidate cannot be selected, save emits only selected IDs, existing questions remain read-only and visible, no-candidate state, long German text wraps without clipping.
- [ ] **Step 2: Run the targeted test and verify it fails**

  Run: `npx vitest run src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationEditor.test.ts`

  Expected: FAIL because the component does not exist.
- [ ] **Step 3: Implement the candidate and existing-question sections**. Keep recommendation content visually primary, metadata secondary, selection states obvious, and existing question table structurally compact; expose the return action at the same predictable position on every market.
- [ ] **Step 4: Run the targeted test**

  Run: `npx vitest run src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationEditor.test.ts`

  Expected: PASS, with selection never exceeding five and current questions unchanged until service success.
- [ ] **Step 5: Commit**

  ```bash
  git add src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationEditor.vue src/components/visibility-monitoring/settings/brand-knowledge-update/MarketRecommendationEditor.test.ts
  git commit -m "feat: add per-market recommendation selection"
  ```

## Task 4: Orchestrate the flow and preserve editor drafts

**Files:**
- Modify: `src/components/onboarding/knowledge/KnowledgeEditorDialog.vue`
- Test: `src/components/onboarding/knowledge/KnowledgeEditorDialog.test.ts`
- Create: `src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeUpdateFlow.vue`
- Create: `src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeUpdateFlow.test.ts`

**Interfaces:**
- Add `closeOnSave?: boolean` to `KnowledgeEditorDialog`, default `true`; when false, emit validated items but keep the dialog and draft open.
- Flow props: `open`, `items`, `initialTab`; emits `update:open`, `knowledgeCommitted(items)`, `processMarket(marketId)`, `marketSelectionSaved(snapshot)`, `enableAllMarkets(snapshot)`.
- Flow injection: `service: BrandKnowledgeUpdateService` (required prop to make mock/service behavior testable).

- [ ] **Step 1: Write failing tests** for `closeOnSave=false` keeping editor open after valid save and default mode still closing; flow load/preview/confirm order; canceled confirmation makes no mutation and preserves the editor draft; confirm failure stays retryable; successful confirm commits knowledge once and opens market list; duplicate submit produces one service call; list retry reloads service state.
- [ ] **Step 2: Run targeted tests and verify failures**

  Run: `npx vitest run src/components/onboarding/knowledge/KnowledgeEditorDialog.test.ts src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeUpdateFlow.test.ts`

  Expected: FAIL on the new handshake behaviors.
- [ ] **Step 3: Implement editor save control and flow container**. `previewChange` runs before showing impact confirmation; only `confirmChange` may commit the draft. On back, preserve the editor instance/draft. After success, emit the committed knowledge and snapshot; failures retain the current step and user input.
- [ ] **Step 4: Run targeted tests**

  Run: `npx vitest run src/components/onboarding/knowledge/KnowledgeEditorDialog.test.ts src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeUpdateFlow.test.ts`

  Expected: PASS; mock mutation counters show no side effects before explicit confirmation.
- [ ] **Step 5: Commit**

  ```bash
  git add src/components/onboarding/knowledge/KnowledgeEditorDialog.vue src/components/onboarding/knowledge/KnowledgeEditorDialog.test.ts src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeUpdateFlow.vue src/components/visibility-monitoring/settings/brand-knowledge-update/BrandKnowledgeUpdateFlow.test.ts
  git commit -m "feat: orchestrate brand knowledge update flow"
  ```

## Task 5: Connect market selection to the existing monitoring-question stage

**Files:**
- Modify: `src/components/visibility-monitoring/settings/MonitoringSetupStage.vue`
- Modify: `src/views/VisibilityMonitoringView.vue`
- Test: `src/views/visibility-monitoring-integration.test.ts`

**Interfaces:**
- `MonitoringSetupStage` accepts optional `recommendationMarket`, `recommendationSelectedIds`, and `recommendationPending`; emits `saveRecommendationSelection(ids)` and `returnToMarketList`.
- `VisibilityMonitoringView` owns only `activeStep` and the active market-editor panel connection; the flow container owns its service snapshot and modal steps.

- [ ] **Step 1: Write failing integration tests** for opening maintenance from stage 1; save → impact confirm → market list; process a market closes the list and displays screenshot-3 candidate UI within stage 3; return opens the list; successful market save refreshes statuses; enable-all uses service and returns current server snapshot.
- [ ] **Step 2: Run the integration test file and verify the new flow tests fail**

  Run: `npx vitest run src/views/visibility-monitoring-integration.test.ts`

  Expected: FAIL because the view is not wired to the new flow.
- [ ] **Step 3: Connect the flow and stage 3**. Keep existing maintenance/read-only and question editing behavior intact outside the new workflow; update `onboardingStore` only after confirm success, not after the editor's preliminary save.
- [ ] **Step 4: Run the integration test file**

  Run: `npx vitest run src/views/visibility-monitoring-integration.test.ts`

  Expected: PASS for both old scenarios and the new screenshot path.
- [ ] **Step 5: Commit**

  ```bash
  git add src/components/visibility-monitoring/settings/MonitoringSetupStage.vue src/views/VisibilityMonitoringView.vue src/views/visibility-monitoring-integration.test.ts
  git commit -m "feat: connect market recommendations to monitoring setup"
  ```

## Task 6: Visual polish and full verification

**Files:**
- Modify as needed: the new flow components and their feature-scoped styles only.
- Verify: all Task 1–5 tests and browser screenshots.

**Interfaces:** No new public interface; only visual correction within approved component boundaries.

- [ ] **Step 1: Run full automated checks**

  Run: `npm test && npm run lint && npm run build`

  Expected: all commands exit 0.
- [ ] **Step 2: Launch the dev server and walk the complete flow** at 1440×900: maintenance → save → impact confirm → back/cancel path → confirm → market list → market recommendation editor → save → return to list → enable all.
- [ ] **Step 3: Capture and inspect screenshots** at 1440×900 and 375×812. Check modal width/height against content, title/body/footer balance, consistent control sizing, clean alignment, readable text wrapping, clear status hierarchy, keyboard focus visibility, and no page-level horizontal overflow.
- [ ] **Step 4: Make only evidence-backed visual refinements** using existing semantic tokens; rerun the affected component/integration tests and `npm run build` after CSS/template changes.
- [ ] **Step 5: Commit final visual polish**

  ```bash
  git add src/components/visibility-monitoring/settings/brand-knowledge-update src/views/VisibilityMonitoringView.vue src/components/visibility-monitoring/settings/MonitoringSetupStage.vue
  git commit -m "style: polish brand update workflow"
  ```

