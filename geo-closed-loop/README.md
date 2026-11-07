# GEO Agent Web

这是 GEO Agent Web 的独立前端副本，用于验证「诊断与策略 → 优化中心 → 执行/发布 → 结果回流」的完整闭环，不影响原项目的在线页面。

## 当前数据来源

当前版本仍是前端原型：诊断、策略、任务、内容预览和官网执行状态均由本地 mock 数据与浏览器 `localStorage` 驱动，不连接真实监测、知识库、AI 生成、AI 建站或发布接口。页面内不再使用「演示资料」文案；接入生产环境前，仍需替换为真实 API 与业务数据源。

业务状态按产品版本分别保存在：

- `geo-workbench:managed`：AI + 专家 + 客户
- `geo-workbench:agent`：AI + 客户

## 启动

```sh
npm install
npm run dev
```

启动后在浏览器打开 Vite 输出的本地地址。

## 重置本地状态

在浏览器开发者工具 Console 执行：

```js
localStorage.removeItem('geo-workbench:managed')
localStorage.removeItem('geo-workbench:agent')
location.reload()
```

重载后会恢复内置的初始诊断、策略与任务数据。不同浏览器或无痕窗口的数据彼此独立。

## 已验证闭环

- 诊断 Finding → 候选策略审核 → 去重编排 Task → Brief → 内容生成/核查 → 客户或专家审核 → 官网执行/外部交付 → 发布确认 → 完成并回写状态。
- AI + 专家 + 客户：官网内容与外部内容均经过专家和客户审核；客户不能在专家审核阶段使用 AI 写作。
- AI + 客户：无正向 Gap 证据的策略先进入原因核查；核查结论可生成后续内容/外部信源任务，技术原因进入直接修复，业务能力缺口只记录、不生成宣传内容。
- 官网任务完成后，诊断与策略状态会更新为已完成，并可从来源策略进入关联任务查看结果。
