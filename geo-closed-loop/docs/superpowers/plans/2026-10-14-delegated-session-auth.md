# 委托会话认证接入实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 iframe GEO Agent Web 中兑换并续期委托会话 Token、加载用户信息，并让共享业务 API 安全携带 `x-session-token`。

**Architecture:** 新增委托会话模块，集中负责 URL Ticket、sessionStorage、认证接口及父页面 postMessage 协议。共享 Axios 客户端等待会话初始化、附加 Token，并在识别到会话失效时通过 single-flight 续期且最多重试原请求一次。应用启动时初始化身份上下文；环境配置为 test 构建提供指定 API base URL。

**Tech Stack:** Vue 3、TypeScript、Axios、Vite、Vitest、jsdom。

**Spec:** `docs/superpowers/specs/2026-10-14-delegated-session-auth-design.md`

## Global Constraints

- Token 仅存于当前标签页 `sessionStorage` 和内存；Ticket 不写入任何 storage，且从 URL 读取后立即移除。
- `postMessage` 禁止使用 `'*'`；校验来源窗口、显式允许的 Origin、协议版本、消息类型和 pending `requestId`。
- 认证接口使用独立 Axios 客户端，避免业务拦截器递归。
- 并发会话失效共享单次续期；业务请求最多重试一次。
- 测试 API base URL 必须是 `http://test-geo-agent-ops.ce-group.cn/geo-agent-web`；开发和生产现有 `/api` 行为不变。
- Ticket、Token 和完整消息 payload 不得写入日志。

## Review Focus

- URL 含其它 query/hash 或 history state 时移除 Ticket 不得破坏它们；由 Task 2 测试覆盖。
- 父页面消息来自错误窗口/Origin、requestId 不匹配、畸形 payload 或延迟超时时必须拒绝；由 Task 1 测试覆盖。
- sessionStorage 内容损坏、过期或字段不完整时不能复用；由 Task 2 测试覆盖。
- HTTP 401 与 HTTP 200 业务响应中的失效标识都应触发同一续期逻辑；由 Task 3 测试覆盖。
- 并发失效及续期后再次失效不得导致重复索票或无限重试；由 Task 3 测试覆盖。

---

## 文件结构

- 新建 `src/api/delegated-session.ts`：会话类型、storage、Ticket request/response 消息桥、认证端点调用、初始化和续期 single-flight。
- 新建 `src/api/delegated-session.test.ts`：Ticket 协议、来源校验、超时、storage、兑换与用户信息初始化测试。
- 修改 `src/api/http.ts`：业务请求等待认证并携带 `x-session-token`；识别会话失效并续期重试一次；保留现有 `ApiError` 对普通 HTTP 错误的行为。
- 新建 `src/api/http.test.ts`：请求头、会话失效识别、并发续期、重试上限和普通错误测试。
- 修改 `src/main.ts`：在应用启动时启动会话初始化，保证业务请求可等待其完成。
- 修改 `src/env.d.ts`：声明父页面 Origin allowlist 环境变量。
- 新建 `.env.test`：声明指定测试 API base URL 和测试宿主 Origin 配置键（Origin 值由宿主提供后补齐；实现不得默认放宽为任意 Origin）。
- 修改 `package.json`：增加 `build:test`，运行 `vite build --mode test`。

## 任务

### Task 1：实现受校验的父页面 Ticket 消息桥

**Files:**
- Create: `src/api/delegated-session.ts`
- Test: `src/api/delegated-session.test.ts`

**Interfaces:**
- Produces: `requestParentTicket(reason: 'session_missing' | 'session_invalid'): Promise<string>`。
- 消息协议固定为 spec 中的 `geo-agent` channel、version `1`、`ticket.request` / `ticket.response` 和 requestId 相关响应结构。

- [ ] **Step 1: 写失败测试**：用 jsdom mock `window.parent.postMessage`；测试请求 envelope 字段、匹配 requestId 的成功响应，以及非 parent source、非 allowlist origin、未知 requestId、空 Ticket、错误响应和超时均 reject。并验证请求的 `targetOrigin` 是配置的精确 Origin 而不是 `'*'`。
- [ ] **Step 2: 运行定向测试确认失败**：运行 `npx vitest run src/api/delegated-session.test.ts`，预期失败，因为消息桥接口尚不存在。
- [ ] **Step 3: 实现最小消息桥**：定义消息类型和 allowlist 解析；通过 pending request map 匹配 requestId；注册/清理 `message` listener；默认 15 秒超时；`crypto.randomUUID()` 不可用时明确 reject，不生成可预测凭据。
- [ ] **Step 4: 运行定向测试确认通过**：再次运行 `npx vitest run src/api/delegated-session.test.ts`，预期通过，并确保所有用例清理 timer/listener。

### Task 2：实现会话存储、兑换和用户初始化

**Files:**
- Modify: `src/api/delegated-session.ts`
- Test: `src/api/delegated-session.test.ts`

**Interfaces:**
- Produces: `initializeDelegatedSession(): Promise<UserInfo>`、`getSessionToken(): string | null`、`renewDelegatedSession(): Promise<string>`。
- 会话记录形状：`{ version: 1, sessionToken: string, expiresAt: string }`；用户信息运行时类型包含 `customerId`、`siteId`、`tenantId`、`userId`、`userName`、`accountId`、可空 `accountCategory`。

- [ ] **Step 1: 写失败测试**：覆盖 URL Ticket 优先兑换、成功后删除 ticket 且保留其它 query/hash/history state、URL 无 Ticket 时走 Task 1 消息桥、成功兑换后调用 userinfo、有效 sessionStorage 刷新时跳过 exchange、损坏/过期数据清理后重新取 Ticket、无效 exchange/userinfo 响应拒绝。
- [ ] **Step 2: 运行定向测试确认失败**：运行 `npx vitest run src/api/delegated-session.test.ts`，确认新场景失败。
- [ ] **Step 3: 实现会话生命周期**：用独立 `axios.create()` 调用 `${VITE_API_BASE_URL}/geo/auth/exchange` 和 `/geo/auth/userinfo`；读取 URL Ticket 后立即 `history.replaceState(history.state, '', url)` 删除 query 中的 ticket；只在成功校验 `code === 200`、Token 非空及有效 expiresAt 后保存版本化 sessionStorage；userinfo 使用新 Token 的 `x-session-token`。
- [ ] **Step 4: 实现续期 single-flight**：`renewDelegatedSession()` 同时只发起一个父页面 Ticket 请求和一次 exchange；写入新 Token 后返回它；失败时清除旧会话并让所有等待者收到明确错误。
- [ ] **Step 5: 运行定向测试确认通过**：运行 `npx vitest run src/api/delegated-session.test.ts`，所有初始化、刷新和续期用例通过。

### Task 3：接入共享 Axios、失效识别和单次重试

**Files:**
- Modify: `src/api/http.ts`
- Test: `src/api/http.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `initializeDelegatedSession()`、`getSessionToken()`、`renewDelegatedSession()`。
- `http` 继续作为业务 Axios 实例导出；不得在普通请求中发送 `Authorization: Bearer` 替代 `x-session-token`。

- [ ] **Step 1: 写失败测试**：验证请求等待 initialize 后包含 `x-session-token`；兑换 client 不受业务拦截器影响；HTTP 401 与 200 envelope 的 `DELEGATED_SESSION_INVALID` 都续期；重放原请求只一次；并发失效只续期一次；普通 4xx 仍转成现有 `ApiError`；续期失败 reject 且不循环。
- [ ] **Step 2: 运行定向测试确认失败**：运行 `npx vitest run src/api/http.test.ts`，确认这些行为未实现。
- [ ] **Step 3: 实现请求和响应拦截器**：请求开始前等待共享初始化 Promise，并从会话管理器注入 `x-session-token`；业务请求配置使用内部 retry 标记避免二次重试；HTTP 响应及错误响应统一检查 spec 定义的失效码位置；续期成功后更新原 config header 并 `http.request(config)` 一次。
- [ ] **Step 4: 保持普通错误兼容**：取消请求继续原样 reject，非失效错误继续转换为 `ApiError`，不要暴露 Ticket/Token 到 error message。
- [ ] **Step 5: 运行定向测试确认通过**：运行 `npx vitest run src/api/http.test.ts src/api/delegated-session.test.ts`，所有会话集成用例通过。

### Task 4：应用启动与 test 构建配置

**Files:**
- Modify: `src/main.ts`
- Modify: `src/env.d.ts`
- Create: `.env.test`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 2 的 `initializeDelegatedSession()`；应用挂载可以先完成，认证失败保留为可观察的 rejected 初始化状态，所有共享业务请求必须 fail closed。

- [ ] **Step 1: 写启动/配置断言**：新建 `src/main.test.ts`，mock Vue app 与 router，确认启动只调用一次初始化并继续 mount；在构建配置测试中确认 test mode API URL、dev/prod 的 `/api` 和 package script `vite build --mode test`。
- [ ] **Step 2: 实现环境声明与脚本**：为 `VITE_IFRAME_PARENT_ORIGINS` 增加 `ImportMetaEnv` 声明；增加 `.env.test` 的 `VITE_API_BASE_URL=http://test-geo-agent-ops.ce-group.cn/geo-agent-web` 和 `VITE_IFRAME_PARENT_ORIGINS=`（暂为空，保持 fail closed，待宿主提供精确来源后配置）；为 `package.json` 增加 `build:test`。
- [ ] **Step 3: 接入启动初始化**：在 `src/main.ts` 中 mount 前启动但不 await `initializeDelegatedSession()`，安装非敏感的错误处理；业务 API 拦截器仍等待同一个初始化 Promise，失败时 reject，页面不能伪装为已认证。
- [ ] **Step 4: 运行配置验证**：运行 `npm run build:test` 并检查产物中 API base URL 为给定测试地址；运行 `npm run build` 确认默认生产构建不变。

### Task 5：全量验证与安全回归

**Files:**
- Update tests from Tasks 1–4 as failures reveal.

- [ ] **Step 1: 运行完整单测**：`npm test`，预期所有 Vitest suites 通过。
- [ ] **Step 2: 运行静态检查**：`npm run lint` 和 `npm run build`，预期无 lint/type/build errors。
- [ ] **Step 3: 运行 test mode 构建**：`npm run build:test`，预期通过且使用测试 API base URL。
- [ ] **Step 4: 搜索凭据泄漏路径**：确认实现没有写 localStorage、没有日志输出 Ticket/Token/payload、没有 `postMessage(..., '*')`，并复核 sessionStorage 仅存 session token/expiry。

## Spec 覆盖自检

- Ticket exchange、userinfo、URL Ticket 清理和刷新恢复：Task 2。
- v1 iframe 消息协议、Origin/source/requestId 校验、超时和拒绝行为：Task 1。
- Token 请求头、失效标识、并发续期和单次重试：Task 3。
- 初始化启动、test build 与 dev/prod 不变：Task 4。
- 凭据存储/日志安全和全量验证：Tasks 1–5。
- 待宿主/后端联调确认的 Origin allowlist 与失效码位置仍按规格保留为部署/联调前置项，不由实现猜测。

