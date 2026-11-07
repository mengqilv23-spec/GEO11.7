# 委托会话认证接入设计

## 目标

在 iframe 承载的 GEO Agent Web 中接入委托式会话认证：首次从 iframe URL 获取一次性 Ticket 并兑换会话 Token；刷新时复用当前标签页保存的有效 Token；业务 API 统一携带 `x-session-token`；会话失效时向 iframe 父页面请求新 Ticket、兑换并至多重试原请求一次；每次应用初始化后读取当前用户信息。

## 当前项目情况

- `src/api/http.ts` 提供唯一 Axios 客户端，目前只在内存中保存 `authToken` 并注入 `Authorization: Bearer ...`。
- 代码中没有 `setAuthToken` 调用，也没有实际业务 API 调用或 iframe 消息处理。
- `.env.development` 和 `.env.production` 当前均将 API base URL 配置为 `/api`；开发服务器只为 `/api` 设置本地代理。
- API 文档定义了 Ticket 兑换和用户信息接口：
  - `POST /geo/auth/exchange`，JSON body `{ ticket }`，返回 `data.sessionToken` 和 `data.expiresAt`。
  - `GET /geo/auth/userinfo`，使用 `x-session-token`，返回客户、站点、租户、用户和账号信息。
  - 业务会话失效标识为 `DELEGATED_SESSION_INVALID`。

## 方案与边界

新增独立的委托会话管理模块，负责凭据的生命周期和父子 iframe Ticket 协议；保留共享 Axios 客户端作为业务请求入口，在其请求/响应拦截器中接入会话。认证接口使用不经过业务重试拦截器的底层客户端，避免兑换和续期请求递归触发自身。

模块职责：

- `src/api/http.ts`：提供共享业务 Axios 客户端；请求发出前等待会话初始化、设置 `x-session-token`；响应识别会话失效、协调单次续期并重试业务请求。
- `src/api/delegated-session.ts`：从 URL 获取初始 Ticket、保存和校验会话、调用认证接口、取得用户信息、与父页面交换续期 Ticket，并暴露当前会话/用户信息。
- `src/main.ts`：创建应用后启动认证初始化；认证获取失败不得静默伪造用户上下文。应用 UI 可先挂载，认证 API 请求等待初始化；认证失败时认证 API 明确 reject。
- `.env.test` 与 `build:test`：将测试环境 API 地址配置为 `http://test-geo-agent-ops.ce-group.cn/geo-agent-web`。开发环境 `/api` 代理保持不变，生产环境暂时保留 `/api`，不推测未提供的生产域名。

## 初始化与刷新流程

1. 应用启动时检查 `sessionStorage` 中版本化的会话记录，验证 Token 非空且 `expiresAt` 尚未到期。
2. 如果会话有效，恢复 Token 并调用 userinfo；不重新兑换 Ticket。
3. 如果无有效会话，优先读取 URL query 的 `ticket`；读取并暂存初始 URL Ticket 后立即用 `history.replaceState` 删除 query 中的 `ticket`，保留现有 history state。没有 URL Ticket 时向父页面发送 `reason: 'session_missing'` 的 Ticket 请求。
4. 取得 Ticket 后调用兑换接口，验证响应 `code === 200` 且 Token、过期时间有效；仅将 `sessionToken` 和 `expiresAt` 写入 `sessionStorage`，不持久化 Ticket。
5. 兑换成功后调用 userinfo，并将用户上下文保存在内存中；避免 Ticket 残留在地址栏/历史记录。
6. 会话初始化完成后，业务请求拦截器附加 `x-session-token`。认证接口不自动附加旧 Token，userinfo 使用刚取得/恢复的 Token。

## 父子 iframe Ticket 消息协议 v1

消息 envelope 使用 `channel`、`version`、`type` 和 `requestId`。`requestId` 由子页面使用 `crypto.randomUUID()` 生成；父页面应原样回传。

子页面发送：

```text
{
  channel: 'geo-agent',
  version: 1,
  type: 'ticket.request',
  requestId: string,
  reason: 'session_missing' | 'session_invalid'
}
```

父页面成功响应：

```text
{
  channel: 'geo-agent',
  version: 1,
  type: 'ticket.response',
  requestId: string,
  status: 'ok',
  ticket: string
}
```

父页面失败响应：

```text
{
  channel: 'geo-agent',
  version: 1,
  type: 'ticket.response',
  requestId: string,
  status: 'error',
  error: { code: 'TICKET_UNAVAILABLE' | string }
}
```

协议约束：

- 子页面接收消息时同时验证 `event.source === window.parent`、`event.origin` 在显式允许列表中、envelope 版本/类型正确、`requestId` 与等待中的请求匹配，且成功 Ticket 非空。
- 父页面只响应来自预期子页面 Origin 且 `event.source === iframe.contentWindow` 的请求；响应时使用精确子页面 Origin。
- `postMessage` 不允许使用 `'*'`。父页面 Origin 使用单独配置的 allowlist（建议 `VITE_IFRAME_PARENT_ORIGINS`），不与 API base URL 混用。缺少有效 Origin 配置时拒绝接收/发送凭据，并返回清晰认证错误。
- 等待响应设有限时（建议 15 秒），失败或超时 reject 当前会话获取；多个并发的会话失效响应共享同一续期 Promise 和同一 pending Ticket 请求。
- 日志不得包含 Ticket、Token 或完整消息 payload。

## 会话失效与重试

- Axios 响应拦截器检查 HTTP 错误响应和 HTTP 200 业务 envelope 中的会话错误标识 `DELEGATED_SESSION_INVALID`。
- 同时失效的并发业务请求共享一轮 Ticket 获取与 Token 兑换，避免向父页面重复索票。
- 新 Token 保存成功后，使用新 `x-session-token` 重发原请求一次；通过 Axios config 内部标志阻止无限重试。
- 若父页面无法提供 Ticket、兑换失败、Token/过期时间无效，或重试仍返回会话失效，清除无效会话并将明确的认证错误返回调用方；不自动循环。
- 正常业务 API 的 HTTP 错误仍遵循现有 `ApiError` 处理，不改变非会话错误行为。

## 环境配置

- `.env.development`：继续使用 `/api`，沿用现有 Vite 开发代理。
- `.env.test`：`VITE_API_BASE_URL=http://test-geo-agent-ops.ce-group.cn/geo-agent-web`，并新增 `npm run build:test`（Vite `--mode test`）。
- `.env.production`：本次保留现有 `/api`；生产后端域名未提供，不在本设计中猜测。
- iframe 父页面允许 Origin 是另一项部署配置，不得从测试 API 域名推导。部署前需由宿主方提供测试/生产 parent origin 并配置 allowlist。

## 错误与隐私处理

- Token 仅保存在当前标签页 `sessionStorage` 与内存中；刷新可恢复，新标签页不共享。退出/会话失效时删除对应记录。
- Ticket 仅用于一次兑换，消费后从 URL 移除且不写入任何 storage。
- userinfo 不作为认证凭据持久化；仅存于应用运行时状态。
- sessionStorage 数据必须在读取时解析和校验；损坏、过期或字段不符即删除并重新走 Ticket 获取。
- Origin 校验、来源窗口校验和 `requestId` 校验均为硬约束，不因开发便利而放宽为任意 Origin。

## 验收标准

1. 首次打开时优先使用 URL Ticket 兑换；URL 无 Ticket 时按 v1 协议向父页面请求。
2. 成功兑换后调用 userinfo，身份字段映射完整；地址栏不再保留初始 Ticket。
3. 刷新且 Token 未过期时不请求新 Ticket，仍能取得 userinfo。
4. 所有共享业务 API 请求均携带 `x-session-token`，兑换请求不携带旧会话 Token。
5. `DELEGATED_SESSION_INVALID` 会触发一次续期并最多重试原请求一次；并发失效时只请求一次新 Ticket。
6. 错误来源、错误 requestId、畸形消息、超时、Ticket 兑换失败均安全拒绝；敏感凭据不进入日志或 localStorage。
7. 测试构建使用指定测试 base URL；开发代理和现有生产 `/api` 配置保持不变。
8. 覆盖 API 客户端、会话 storage、iframe 消息校验、初始化/刷新/续期并发、重试上限的测试；`npm test`、`npm run lint`、`npm run build` 和 `npm run build:test` 通过。

## 实施前置项

- 宿主方需确认最终消息协议实现与字段命名（本设计已获产品确认），并提供测试/生产允许的父页面 Origin 列表。
- 生产 API base URL 目前未知，本次继续使用仓库现有 `/api` 配置，待提供后再单独改动。
- 后端需确认 `DELEGATED_SESSION_INVALID` 在 HTTP 401 与 HTTP 200 envelope 中的确切落点；实现应覆盖 envelope `code`、`msg` 和 Axios error body 的判定，但以联调结果为准。

