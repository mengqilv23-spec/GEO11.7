# GEO API 对接覆盖

范围按浏览器前端的用户业务流程划分。后端 `/thrid/**` 是供外部平台调用的接入端，不视作本前端应主动调用；健康检查、演示/Redis 测试、邮件与 LLM 运维端点也不接入业务页面。

| 后端模块 / 接口 | 前端现状 | 后续说明 |
| --- | --- | --- |
| `/geo/auth/exchange`、session user info、父页面 ticket `postMessage` | 已接入 | 会话到期时向父页面请求新 ticket 并续期；请求重放一次。 |
| `/report/list`, `/detail*`, `/quota`, `/latest/overview`, `/latest/generate`, `/task/progress`, `/export` | 已有 API 与报告中心/详情页面 | 核对 HTML/PDF 导出端点能力；观察项接口按后端 TODO 不假装可操作。 |
| `/geo/exec/metrics/trend`, `/rounds/{id}/metrics/brand`, `/platform` | 概览页本轮已接入 | 真实趋势和最近轮次指标；空/错误/null 有显式呈现。 |
| `/geo/exec/rounds`, round detail/responses, metrics, sources, question-hits | 最近轮次和各结果面板已接入可见性监测页 | 最近轮次详情、品牌/平台/人设指标、问题命中、来源域名/页面及回答详情抽屉均读 API；按接口最多 50 条展示并支持内部纵向滚动。 |
| `/geo/exec/schedule`, trigger, pause/resume | 状态查询/保存、启停、手动触发已接入可见性监测页 | 未配置返回 `data: null` 显示为“未配置”；保存/触发错误保留弹窗并显示错误。回答详情见下一行。 |
| `/geo/config/market/list`, market read queries, dict, brand read, plan, wizard status, config change status | API client + 契约测试；市场切换器、概览、配置只读面板、首次向导和新增市场向导已接入 | 当前上下文品牌/产品/竞品/人设/问题/主题/平台按接口读取。进入业务页前校验服务端入口状态；未配置或向导未完成时强制转入新人引导。新增市场只绑定后端已存在的未启用市场，不凭国家下拉伪造创建。 |
| market switch、brand/persona/question/platform/competitor/product writes、AI recommendations、wizard writes、config change writes | 已有 typed API client + 操作人注入测试；市场切换、配置向导与监测平台/计划写操作已接入 | 新人引导按步骤先保存实体再推进服务端向导状态；最终步骤保存平台与计划并调用开始监测。AI 推荐和配置变更写操作按后端实现状态处理，不显示假成功。 |
| `/diagnosis/issues`, `gaps`, `strategies` and available detail endpoints | 列表及可用详情已接入 Diagnosis 页面 | 通过会话用户 siteId 查询，不将本地 fixture 混作回退；暂无后端写入端点，隐藏本地审批/确认假操作。优化中心仍有未实现接口，不宣称已接通。 |
| `/oss/file/**` | 未接入 | 上传/下载能力未用于当前可见业务流程。 |
| report observations / observation action | 按 TODO 保留空态 | 后端明确标注生成/联动逻辑未实现。 |

## 本次落地范围

- `src/api/monitoring.ts`、`src/api/geo-config.ts`：基于 controller 与 facade VO 对齐路径、参数名、返回类型和操作人要求。
- `src/composables/use-server-markets.ts`、`src/components/market/MarketSwitcher.vue`：市场下拉改读后端数据；API 失败时显示错误，不回退到静态 starter markets 或本地配额；未启用市场不可误切入监测页。
- `src/views/OverviewView.vue`：趋势/品牌/平台真实数据切片；删除本页固定演示指标、模拟平台汇总、伪监测状态与假队列。
- `src/data/monitoring-api-adapters.ts`：将指标接口映射到图表，并保留 null，不合成 0。
- 已接线：新人引导写流程、服务端 onboarding route gate、监测回答详情抽屉、诊断可用详情 UI。
- 不虚构的范围：市场创建后端接口未实现；优化中心及诊断推荐动作暂无完整写接口；报告观察/部分增强能力仍按后端 TODO 展示。
- 验证：全量 Vitest 与 TypeScript production build；无运行中的后端/数据库，未完成真实浏览器端到端请求验证。

