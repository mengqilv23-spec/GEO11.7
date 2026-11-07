# 可见性监测实施计划

## Overview

新人引导完成后进入沿用现有工作台外壳的「可见性监测」结果页。完整架构、组件接口、TDD 步骤和验收标准见下方链接的详细计划。

## Architecture decisions

- 新人引导继续独立、无侧栏；结果页在现有工作台布局下新增路由和侧栏入口。
- 演示数据集中管理，首版不接入真实监测 API 或采样服务。
- 统计图表使用按需注册的 ECharts；普通 UI 图标沿用项目组件。
- 结果页拆为概览、品牌分析、问答明细、信源追踪和采样设置区块。
- 页面专属组件统一放在 `src/components/pages/visibility-monitoring/`；共享组件留在原有 `components/` 位置。
- 视觉遵循 `external-iframe-style-guide.md` 的语义 token、排版和响应式要求；保留本项目 Vue、CE 与 ECharts 技术栈。
- 页面只有一个纵向滚动区域；宽表格局部横滚；验证至320px内容宽度和200%缩放。

## Task list

### Phase 1: Foundation and entry flow

- [x] Task 1: 类型化演示数据
- [x] Task 2: 可见性监测路由和守卫
- [x] Task 3: 工作台侧栏入口和新人引导跳转

### Checkpoint: Foundation

- [x] 数据与路由/流程测试通过，生产构建通过。
- [x] 新人引导无侧栏，结果页可从引导到达且导航高亮正确。

### Phase 2: Charts and primary analyses

- [x] Task 4: ECharts 趋势图和热力图基础组件
- [x] Task 5: 监测概览、可信度和采样规则
- [x] Task 6: 品牌/竞品趋势及两类热力图

### Checkpoint: Primary analyses

- [x] 图表、概览和品牌分析测试及生产构建通过。
- [x] 主要页面区块均消费共享演示数据。

### Phase 3: Details and settings

- [x] Task 7: 问答命中明细和问题详情
- [x] Task 8: 信源域名/页面追踪和详情
- [x] Task 9: 采样频率与平台设置
- [x] Task 10: 集成、响应式布局及端到端验收

### Checkpoint: Complete

- [x] 测试、lint、生产构建和浏览器验收通过。

## Risks

- 页面内容多，避免把全部区块塞进一个路由组件；按分析区域拆组件。
- ECharts 对不完整数据和隐藏容器尺寸敏感；纯 option 测试 + ResizeObserver。
- 长德语文本可能溢出；使用滚动容器并做窄屏浏览器验证。
- 工作区已有暂存改动；限定文件范围，不提交或覆盖无关改动。

## Detailed plan

[2026-10-09 可见性监测实施计划](../docs/superpowers/plans/2026-10-09-visibility-monitoring.md)

任务执行顺序清单见 `tasks/todo.md`。

