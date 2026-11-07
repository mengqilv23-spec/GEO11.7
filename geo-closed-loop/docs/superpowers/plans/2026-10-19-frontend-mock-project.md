# 纯前端 Mock 项目实施计划

> **执行方式：** 由当前执行者在本会话逐任务完成；用户已明确要求直接开始。按任务完成测试与构建，不在原项目页面中实现 mock 逻辑。

**目标：** 创建可独立启动的 `geo-agent-web-mock/` Vue 项目，用持久化本地假数据驱动现有页面流程且视觉样式不变。

**架构：** 将应用复制到独立子目录，保留 UI/路由/数据契约，在副本中用版本化 localStorage 仓库和本地 mock 服务替换所有网络请求。移除 HTTP、认证和宿主桥接启动，数据跨页面共享，竞品推荐与手动竞品分组去重。

**技术栈：** Vue 3、TypeScript、Vite、现有 CSS Token/组件、Vitest；不增加运行时依赖。

**设计稿：** `docs/superpowers/specs/2026-10-19-frontend-mock-project-design.md`

## 全局约束

- 原页面与原应用源文件保持不变；应用复制及 mock 改造只发生在 `geo-agent-web-mock/`。
- 项目可仅通过 `npm install` 和 `npm run dev` 启动，不依赖后端、iframe 或 API 凭证。
- 保留现有视觉样式、路由、页面文案与交互结构。
- mock 状态写入版本化 localStorage，提供确定的重置办法。
- 手动竞品与 AI 推荐候选始终独立；名称、别名、域名规范化去重。
- 不复制 `.git`、`node_modules`、`dist`、编辑器状态或真实环境文件。

## 审查重点

1. 空、坏格式或旧版本 localStorage：应用应恢复可用种子状态，而不是空白页或崩溃。
2. 手动竞品与推荐候选大小写、协议、`www` 或别名差异：规范化后应正确去重。
3. 连续接受/忽略同一个 AI 候选：不能重复写入或生成错误状态。
4. 刷新页面或跨页面切换后编辑数据：更改应保留且使用同一个仓库状态。
5. 无 API / 未嵌入宿主环境启动：应用应正常加载，无网络调用和后端读取文案。

---

### Task 1: 创建独立项目副本

**文件：**
- 创建：`geo-agent-web-mock/` 下的源码、测试、静态资源和项目配置副本
- 创建：`geo-agent-web-mock/README.md`
- 修改：副本的 `package.json`、环境配置和 Vite 配置

**接口：**
- 产出：独立、可安装的项目目录，初始页面代码与原项目一致。

- [ ] 复制除 `.git`、`node_modules`、`dist`、编辑器状态和 `.env*` 外的项目文件。
- [ ] 将 package 名称设为 `geo-agent-web-mock`，移除真实 API 地址和代理目标，提供安全的本地默认值。
- [ ] 编写 README，说明 `npm install`、`npm run dev` 与当前 mock 方案。
- [ ] 用文件清单与忽略路径校验副本未包含 `.git`、依赖、构建产物或真实凭证。
- [ ] 在副本运行 `npm run build`，确认原始复制页面可独立构建。

### Task 2: 实现本地持久化仓库与种子数据

**文件：**
- 创建：`geo-agent-web-mock/src/mock/state.ts`，定义版本化共享状态
- 创建：`geo-agent-web-mock/src/mock/repository.ts`，实现初始化、读取、原子更新、重置和本地持久化
- 创建：`geo-agent-web-mock/src/mock/seed.ts`，提供跨页面一致的初始数据
- 测试：`geo-agent-web-mock/src/mock/repository.test.ts`

**接口：**
- 产出：`readMockState(): MockState`、`updateMockState(mutator): MockState`、`resetMockState(): MockState`。
- 消费：副本原有 `src/types` 与 `src/data` 中可复用的数据模型。

- [ ] 先写测试：首次加载注入种子、更新后重读一致、刷新存储可恢复、reset 还原种子。
- [ ] 写测试并验证坏 JSON、未知 schema 版本会安全回退种子。
- [ ] 实现 schema 版本键 `geo-agent-web-mock:v1` 和隔离的本地存储读写。
- [ ] 初始化品牌、产品、市场、买家人设、问题、平台、监测计划、竞品、推荐候选、轮次、诊断、任务、报告等数据。
- [ ] 运行仓库测试与 `npm run build`。

### Task 3: 建立本地 mock 服务层

**文件：**
- 创建：`geo-agent-web-mock/src/mock/config-service.ts`
- 创建：`geo-agent-web-mock/src/mock/monitoring-service.ts`
- 创建：`geo-agent-web-mock/src/mock/report-service.ts`
- 创建：`geo-agent-web-mock/src/mock/diagnosis-service.ts`
- 创建：对应 `*.test.ts`

**接口：**
- 产出：与页面当前依赖相匹配的本地异步业务操作；所有读写最终使用同一个 MockState。
- 约定：服务加入约 120ms 的确定延迟；每个服务不导入 `axios`、`fetch` 或真实 API 客户端。

- [ ] 测试市场/品牌/产品/竞品/人设/问题/platform 的读取、增改删、候选生成与确认。
- [ ] 测试监测计划保存、暂停/恢复、手动采集后新增轮次和结果。
- [ ] 测试报告列表过滤、最新报告生成、报告详情读取。
- [ ] 测试诊断/优化/任务更新在共享状态中可读。
- [ ] 写最小实现并确保本地 mock 返回值符合现有视图数据契约。

### Task 4: 解除副本对宿主认证和网络传输的依赖

**文件：**
- 修改：`geo-agent-web-mock/src/main.ts`、`App.vue`、`stores/geo-context.ts`
- 修改：副本的路由守卫与 app 初始化代码
- 删除或移出运行时：副本 `src/api/http.ts`、`delegated-session.ts`、`ops3-bridge.ts` 及 API 代理设置
- 测试：副本的启动、根路由及地理上下文测试

**接口：**
- 产出：固定演示用户和市场上下文从本地 mock state 提供。

- [ ] 测试无 iframe、无 ticket、无 host app 时应用可以初始化并进入页面。
- [ ] 移除启动阶段认证、宿主消息监听和远程会话检查。
- [ ] 用本地 demo 用户/站点/市场状态初始化 store 与路由上下文。
- [ ] 搜索并清除应用 shell 中 API 错误 toast、auth 初始化等远程请求副作用。

### Task 5: 接通配置与 onboarding 页面

**文件：**
- 修改：`geo-agent-web-mock/src/composables/use-first-config-wizard.ts`
- 修改：`use-market-configuration.ts`、`use-server-markets.ts`、`use-monitoring-platforms.ts`
- 修改：副本的 `OnboardingView.vue`、`MarketSetupView.vue`、`VisibilityMonitoringView.vue` 和相关配置组件
- 测试：副本中 wizard、品牌知识、市场/竞品/人设/问题/平台流程测试

**接口：**
- 消费：任务 2 的 MockState 与任务 3 的 config service。
- 产出：配置表单的所有新增、编辑、删除、保存、市场切换、候选确认均只写本地数据。

- [ ] 对每个可见配置动作先补/调整测试，验证本地服务调用及跨视图数据更新。
- [ ] 将副本运行时代码中的 `geo-config`/`monitoring` API 导入改为本地服务。
- [ ] 逐步移除已有页面对真实 id、operator context 和远程错误格式的依赖。
- [ ] 运行相关测试与 build。

### Task 6: 隔离手动竞品和 AI 推荐竞品

**文件：**
- 修改：`geo-agent-web-mock/src/mock/config-service.ts`
- 修改：副本的 `KnowledgeEditorDialog.vue`、`CompetitorKnowledgePanel.vue`
- 测试：副本的竞品推荐、去重、接受/忽略流程测试

**接口：**
- 产出：`normalizeCompetitorIdentity(value)` 与 `getAvailableCompetitorRecommendations()`。
- 规则：比较名称、别名、域名；域名去协议、路径、大小写和 `www` 后匹配。

- [ ] 写失败测试，覆盖相同名称、别名、`https://www.example.com/path` 与 `example.com` 重复情况。
- [ ] mock 中手动竞品和 AI 候选放在不同集合，过滤已维护项目。
- [ ] 接受候选时在一个仓库更新中将其移至手动集合并移除待确认候选；重复接受无副作用。
- [ ] 保持现有候选卡片与竞品卡片样式不变，运行相关测试。

### Task 7: 接通总览、监测、诊断、优化、任务和报告

**文件：**
- 修改：副本 `src/composables/use-monitoring-round.ts`、`use-round-responses.ts`、`use-monitoring-schedule.ts`、`use-diagnosis-data.ts`
- 修改：副本 `OverviewView.vue`、`DiagnosisView.vue`、`OptimizationView.vue`、`TaskDetailView.vue`、`ReportCenterView.vue`、`ReportDetailView.vue`
- 修改：相关列表、采集、报告、诊断和任务组件
- 测试：副本对应的 view/composable 测试

**接口：**
- 消费：任务 3 本地 monitor/report/diagnosis 服务。
- 产出：页面读写数据只访问本地状态，导航、筛选和操作保持可用。

- [ ] 先为暂停/恢复、手动采集、结果更新、诊断查看、优化和任务完成补可观察行为测试。
- [ ] 将页面内其余 `src/api/*` 函数调用替换为 mock 服务，并移除远程请求状态处理。
- [ ] 实现报告筛选、生成最新报告和详情页面本地数据闭环。
- [ ] 运行视图与 composable 测试。

### Task 8: 全项目无网络验证与使用文档

**文件：**
- 修改：`geo-agent-web-mock/README.md`
- 测试：副本全量测试与构建

- [ ] 搜索运行时代码中 `axios`、`fetch`、XHR、API host、Vite proxy 和远程认证入口；测试夹具中的词例不算运行时依赖。
- [ ] 运行副本 `npm test`、`npm run lint` 和 `npm run build`，修复本次引入的问题。
- [ ] 在浏览器验证配置保存、竞品推荐去重与接受、采集暂停/恢复、报告生成/详情四条流程。
- [ ] 刷新浏览器确认状态持久化，再按 README 的 reset 指令恢复种子数据。
- [ ] 同尺寸打开原项目与副本，核对关键页面样式；确保原页面文件未发生差异。


