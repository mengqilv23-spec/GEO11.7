import type { GeoTask, TaskProgress } from '../data/geo-data'

import { isCodeContentTask } from './content-format'
import { directRepairStatus, isDirectRepairTask } from './direct-repair'

export interface TaskBrief {
  goal: string
  persona: string
  factor: string
  source: string
  executionTarget: string
  acceptance: string
  /** Legacy fields are retained during migration so saved Brief data is not discarded. */
  audience?: string
  scope?: string
  facts?: string
  deliverables?: string
  constraints?: string
  contentInstruction?: string
  supplementalTopics?: string[]
  webSupplement?: boolean
}
export interface TaskKnowledge {
  id: string
  title: string
  tag: string
  source: string
  status: 'ready' | 'failed'
  content: string
}
export interface TaskVersion {
  version: number
  time: string
  note: string
  brief: TaskBrief
  methods: string[]
  knowledge: TaskKnowledge[]
  output: string
}
export interface IgnoredBrief {
  reason: string
  explanation: string
  actor: string
  time: string
}
export interface IgnoredTask extends IgnoredBrief {
  stage: TaskProgress
  stageLabel: string
}
export type DeferredTask = IgnoredTask
export interface TaskWorkflow {
  brief: TaskBrief
  briefStatus: 'ready' | 'confirmed'
  feedback: string
  versions: TaskVersion[]
  knowledge: TaskKnowledge[]
  output: { title: string, body: string, revision: number, externalClaims?: Array<{ id: string, text: string, source: string, confirmed: boolean }> }
  reviews: Array<{ time: string, actor: string, note: string }>
  ignoredBrief?: IgnoredBrief
  ignoredTask?: IgnoredTask
  deferredTask?: DeferredTask
  site: { requirements: string, attempts: number, simulateFailure: boolean, result: string, targetSite?: string, targetPage?: string, changeType?: string, factBoundary?: string, acceptance?: string }
  url: string
}
export type TaskBucket = 'brief' | 'brief_changes' | 'executing' | 'review' | 'website' | 'done' | 'ignored' | 'deferred'
export type WorkflowAction = 'save_brief' | 'update_web_supplement' | 'confirm_brief' | 'ignore_brief' | 'ignore_task' | 'defer_task' | 'resume_task' | 'save_output' | 'approve_client' | 'return_content_review' | 'submit_site' | 'retry_site' | 'complete_delivery' | 'complete_recheck'
export interface WorkflowPayload {
  note?: string
  ignoreReason?: string
  brief?: TaskBrief
  webSupplement?: boolean
  methods?: string[]
  knowledge?: TaskKnowledge[]
  title?: string
  body?: string
  url?: string
  simulateFailure?: boolean
}
export const knowledgeLibrary: TaskKnowledge[] = [
  { id: 'KB-001', title: '企业与品牌基础信息', tag: '品牌事实', source: '客户知识库', status: 'ready', content: '企业官方名称、品牌定位和业务范围以已确认资料为准；未提供的品牌信息不得补写。' },
  { id: 'KB-002', title: '产品规格与应用场景', tag: '产品资料', source: '客户知识库', status: 'ready', content: '产品参数、应用行业、典型场景与能力边界以已确认规格为准；未提供的性能数据不得推断。' },
  { id: 'KB-003', title: '认证、专利与交付能力', tag: '信任证据', source: '客户知识库', status: 'ready', content: '认证、专利、交期与服务网络以已确认资料为准；未提供编号和承诺的内容不得写入正文。' },
]
const now = () => new Date().toISOString()
function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
function buildCodeBody(task: GeoTask, flow: TaskWorkflow) {
  const title = escapeHtml(flow.output.title || task.name)
  const description = 'APW Waterjet（www.apwwaterjet.com）是工业水刀切割系统与解决方案品牌，提供五轴水刀、高压水刀与本地化服务支持。'
  const schema = [
    '{',
    '  "@context": "https://schema.org",',
    '  "@type": "Organization",',
    '  "name": "APW Waterjet",',
    '  "url": "https://www.apwwaterjet.com/",',
    '  "logo": "https://www.apwwaterjet.com/static/logo.svg",',
    '  "description": "工业水刀切割系统与解决方案品牌",',
    '  "address": {',
    '    "@type": "PostalAddress",',
    '    "streetAddress": "上海市浦东新区金桥路 88 号",',
    '    "addressLocality": "上海",',
    '    "addressCountry": "CN"',
    '  },',
    '  "contactPoint": {',
    '    "@type": "ContactPoint",',
    '    "contactType": "sales",',
    '    "areaServed": ["CN", "JP", "DE"],',
    '    "availableLanguage": ["zh-CN", "en", "ja", "de"]',
    '  },',
    '  "sameAs": ["https://www.linkedin.com/company/apw-waterjet"]',
    '}',
  ].join('\n')
  const code = [
    `<!-- GEO 公共 Schema · ${title} -->`,
    `<meta name="description" content="${description}">`,
    `<meta property="og:title" content="APW Waterjet｜${title}">`,
    `<meta property="og:description" content="${description}">`,
    '<meta property="og:url" content="https://www.apwwaterjet.com/">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="APW Waterjet">',
    '<meta property="og:locale" content="zh_CN">',
    '<meta property="og:image" content="https://www.apwwaterjet.com/static/logo.svg">',
    '<meta property="og:image:alt" content="APW Waterjet">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="APW Waterjet｜${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    '<script type="application/ld+json">',
    schema,
    '</script>',
  ].join('\n')
  return `<pre><code>${escapeHtml(code)}</code></pre>`
}

/**
 * Build an editable draft from the confirmed Brief and selected knowledge.
 * It deliberately avoids inventing facts that are not in the task inputs.
 */
function buildDraftBody(task: GeoTask, flow: TaskWorkflow) {
  if (isCodeContentTask(task))
    return buildCodeBody(task, flow)
  const methods = task.methods.length
    ? task.methods.map(method => `<li>${escapeHtml(method)}</li>`).join('')
    : '<li>待确认执行方法</li>'
  const knowledge = flow.knowledge.length
    ? flow.knowledge.map(item => `<li><strong>${escapeHtml(item.title)}</strong>：${escapeHtml(item.content)}</li>`).join('')
    : '<li>尚未匹配到知识库资料，发布前需要补充可核实的依据。</li>'
  const note = flow.brief.contentInstruction?.trim() || flow.feedback?.trim() || '请在发布前补充适用范围、可公开的事实依据和需要客户确认的业务信息。'
  return [
    `<h2>${escapeHtml(task.name)}</h2>`,
    `<p>${escapeHtml(flow.brief.goal)}。本稿依据已确认的 Brief 与已选知识资料整理，涉及参数、认证、交期和服务承诺的内容发布前需要逐项核对。</p>`,
    `<h2>执行范围</h2><p>${escapeHtml(flow.brief.executionTarget)}</p>`,
    `<h2>内容要点</h2><ul>${methods}</ul>`,
    `<h2>可引用依据</h2><ul>${knowledge}</ul>`,
    `<h2>待确认事项</h2><p>${escapeHtml(note)}</p>`,
  ].join('')
}
function defaultExecutionTarget(task: GeoTask) {
  const subject = task.name.replace(/^核查[：:]\s*/, '').trim()
  if (task.executionKind === 'verification')
    return `核查「${subject}」涉及的原始回答、业务能力与已有资料；确认原因后再决定是否发布内容`
  if (task.type === 'repair') return `官网修复「${subject}」涉及的页面或结构化字段`
  if (task.type === 'external') {
    const channel = /LinkedIn|领英/i.test(task.name) ? '领英' : /YouTube|油管/i.test(task.name) ? 'YouTube' : /CompositesWorld/i.test(task.name) ? 'CompositesWorld' : '待确认的外部平台'
    return `${channel}发布《${subject}》相关内容`
  }
  return `官网发布或更新《${subject}》相关内容`
}
function record(task: GeoTask, actor: string, note: string) {
  ensureWorkflow(task).reviews.push({ time: now(), actor, note })
}
export function ensureWorkflow(task: GeoTask): TaskWorkflow {
  if (task.workflow) {
    if (task.workflow.ignoredBrief && !task.workflow.ignoredTask) {
      task.workflow.ignoredTask = {
        ...task.workflow.ignoredBrief,
        stage: 'brief',
        stageLabel: 'Task Brief 确认',
      }
    }
    const fallbackSource = `${task.source}${task.strategy && task.strategy !== '不经过候选策略' ? ` / ${task.strategy}` : ''}`
    task.workflow.briefStatus ??= task.progress === 'brief' ? 'ready' : 'confirmed'
    task.workflow.site ||= { requirements: '', attempts: 0, simulateFailure: false, result: '' }
    if (task.workflow.site.result.includes('已退回内容优化'))
      task.workflow.site.result = task.workflow.site.result.replace('已退回内容优化', '已退回到修改板块，可以执行修改操作或重新提交')
    task.workflow.versions ||= []
    task.workflow.knowledge ||= []
    task.workflow.knowledge = task.workflow.knowledge.map((item) => {
      const current = knowledgeLibrary.find(known => known.id === item.id)
      if (current)
        return { ...item, title: current.title, tag: current.tag, source: current.source, content: current.content }
      return item.content.startsWith('演示资料：')
        ? { ...item, content: item.content.replace(/^演示资料：/, '') }
        : item
    })
    if (task.workflow.output.body.includes('演示资料：'))
      task.workflow.output.body = task.workflow.output.body.replaceAll('演示资料：', '')
    task.workflow.versions.forEach((version) => {
      if (version.output?.includes('演示资料：'))
        version.output = version.output.replaceAll('演示资料：', '')
    })
    const normalizeBrief = (value: TaskBrief) => {
      const brief = value as TaskBrief & Record<string, string | undefined>
      brief.persona ||= brief.audience || task.persona || '不适用'
      brief.factor ||= task.factor || '—'
      brief.source ||= fallbackSource
      if (!brief.executionTarget || brief.executionTarget === task.destination || brief.executionTarget === '—')
        brief.executionTarget = brief.scope || defaultExecutionTarget(task)
      brief.goal ||= task.name
      brief.acceptance ||= `覆盖「${task.factor}」，符合已确认的业务事实与执行范围。`
      brief.contentInstruction ||= ''
      brief.supplementalTopics ||= []
      brief.webSupplement ??= true
      return brief
    }
    task.workflow.brief = normalizeBrief(task.workflow.brief)
    task.workflow.versions.forEach((version) => {
      version.brief = normalizeBrief(version.brief)
    })
    const brief = task.workflow.brief
    const legacyFacts = [brief.facts, brief.constraints].filter((value): value is string => !!value?.trim()).join('\n')
    const legacySeedOutput = `演示产物：${task.name}\n\n执行范围：${brief.scope || task.destination}\n执行方法：${task.methods.join('、')}\n验收依据：${brief.acceptance}\n\n本内容仅用于流程演示，发布前请核实品牌事实与资料引用。`
    if (task.workflow.output.body === legacySeedOutput || task.workflow.output.body.startsWith('演示产物：') || task.workflow.output.body.startsWith('【本地模拟产物')) {
      task.workflow.output.body = buildDraftBody(task, task.workflow)
    }
    if (isCodeContentTask(task)) {
      task.contentFormat = 'code'
      const body = task.workflow.output.body
      const reviewStarted = ['human', 'client_review', 'client_content_review', 'site_submit', 'site_submitted', 'site_running', 'site_verifying'].includes(task.progress)
      if (reviewStarted && (!body.trim() || body.startsWith('<h2>')))
        task.workflow.output.body = buildCodeBody(task, task.workflow)
    }
    task.workflow.site.targetSite ||= 'APW 水刀切割网站'
    const legacyWebBoundary = '使用客户终审版本；不得扩写未确认的价格、交期、认证和服务承诺'
    if (!task.workflow.site.targetPage || (task.type === 'repair' && task.workflow.site.targetPage === '目标内容页'))
      task.workflow.site.targetPage = task.type === 'repair' ? '相关官网页面 / 全站实体配置' : '目标内容页'
    if (task.type === 'repair') {
      task.workflow.site.changeType = '技术修复'
      if (!task.workflow.site.factBoundary || task.workflow.site.factBoundary === legacyWebBoundary)
        task.workflow.site.factBoundary = '不得改写已确认的企业、认证与产品事实'
    }
    else {
      task.workflow.site.changeType ||= '官网内容新增 / 更新'
      task.workflow.site.factBoundary ||= legacyWebBoundary
    }
    if (legacyFacts && !task.workflow.site.factBoundary.includes(legacyFacts))
      task.workflow.site.factBoundary = `${task.workflow.site.factBoundary}\n${legacyFacts}`
    task.workflow.site.requirements ||= brief.deliverables || ''
    task.workflow.site.acceptance ||= task.workflow.brief.acceptance
    return task.workflow
  }
  const brief: TaskBrief = {
    goal: task.name,
    persona: task.persona || '不适用',
    factor: task.factor || '—',
    source: `${task.source}${task.strategy && task.strategy !== '不经过候选策略' ? ` / ${task.strategy}` : ''}`,
    executionTarget: defaultExecutionTarget(task),
    acceptance: `覆盖「${task.factor}」，符合已确认的业务事实与执行范围。`,
    contentInstruction: '',
    supplementalTopics: [],
    webSupplement: true,
  }
  task.workflow = {
    brief,
    briefStatus: task.progress === 'brief' ? 'ready' : 'confirmed',
    feedback: '',
    versions: [],
    knowledge: [],
    output: { title: task.name, body: '', revision: 1 },
    reviews: [],
    site: { requirements: '', attempts: 0, simulateFailure: false, result: '', targetSite: 'APW 水刀切割网站', targetPage: task.type === 'repair' ? '相关官网页面 / 全站实体配置' : '目标内容页', changeType: task.type === 'repair' ? '技术修复' : '官网内容新增 / 更新', factBoundary: task.type === 'repair' ? '不得改写已确认的企业、认证与产品事实' : '使用客户终审版本；不得扩写未确认的价格、交期、认证和服务承诺', acceptance: brief.acceptance },
    url: '',
  }
  if (['human', 'client_review', 'site_submit', 'site_publish', 'done'].includes(task.progress))
    task.workflow.output.body = buildDraftBody(task, task.workflow)
  saveVersion(task, '初始 Brief')
  return task.workflow
}
function saveVersion(task: GeoTask, note: string) {
  const flow = ensureWorkflow(task)
  flow.versions.push({ version: flow.versions.length + 1, time: now(), note, brief: { ...flow.brief }, methods: [...task.methods], knowledge: flow.knowledge.map(item => ({ ...item })), output: flow.output.body })
}
export function isStructureOnly(task: GeoTask, methods = task.methods) {
  const text = [task.name, task.factor, task.destination, ...methods].join(' ')
  return task.type !== 'external' && /官网结构优化|网站结构优化|页面结构优化|抓取渲染|爬取障碍|索引|robots|sitemap|canonical|重定向|导航结构|页面层级/i.test(text) && !/结构化数据|schema|sameAs|FAQ|Product|产品|认证|专利|地址|企业信息|品牌|事实|JSON-LD/i.test(text)
}
export function briefGate(
  task: GeoTask,
  contentInstruction = task.workflow?.brief.contentInstruction || '',
  webSupplement = task.workflow?.brief.webSupplement ?? false,
): string[] {
  const errors: string[] = []
  if (!task.methods.some(method => method.trim()))
    errors.push('至少选择 1 个执行方法')
  const flow = task.workflow
  if (!flow || !flow.brief.goal.trim() || !flow.brief.executionTarget.trim() || !flow.brief.acceptance.trim())
    errors.push('填写任务目标、执行对象与验收条件')
  const hasReadyKnowledge = flow?.knowledge.some(item => item.status === 'ready' && item.content.trim()) ?? false
  if (!hasReadyKnowledge && !contentInstruction.trim() && !webSupplement)
    errors.push('选择知识资料、填写补充说明或勾选联网补充')
  return errors
}
export function validPublishUrl(value: string) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password
  }
  catch {
    return false
  }
}
export function canPrepareBrief(task: GeoTask) {
  return task.progress === 'brief' && !isTaskIgnored(task) && !isTaskDeferred(task) && task.workflow?.briefStatus === 'ready'
}
export function canIgnoreCurrentStep(task: GeoTask): boolean {
  if (isDirectRepairTask(task) || task.progress === 'done')
    return false
  if (task.progress === 'brief')
    return task.workflow?.briefStatus === 'ready'
  return true
}
export function ignoredTaskFor(task: GeoTask): IgnoredTask | undefined {
  const workflow = task.workflow
  if (!workflow)
    return undefined
  return workflow.ignoredTask || (workflow.ignoredBrief
    ? { ...workflow.ignoredBrief, stage: 'brief', stageLabel: 'Task Brief 确认' }
    : undefined)
}
export function isTaskIgnored(task: GeoTask): boolean {
  return Boolean(ignoredTaskFor(task))
}
export function deferredTaskFor(task: GeoTask): DeferredTask | undefined {
  return task.workflow?.deferredTask
}
export function isTaskDeferred(task: GeoTask): boolean {
  return Boolean(deferredTaskFor(task))
}
/** Pure validation: UI visibility never substitutes for action authorization. */
export function validateAction(task: GeoTask, action: WorkflowAction, payload: WorkflowPayload = {}): string | null {
  if (isDirectRepairTask(task)) return '官网技术直接处理由 AI 建站自动执行，无需人工操作'
  const stage = task.progress
  const flow = task.workflow
  if (!flow)
    return '任务尚未初始化'
  if (isTaskIgnored(task) && action !== 'ignore_task')
    return '本次审核事项已忽略，不能继续处理'
  if (isTaskDeferred(task) && action !== 'resume_task' && action !== 'ignore_task')
    return action === 'defer_task' ? '本次审核事项已暂不处理' : '本次审核事项已暂不处理，请先恢复处理'
  const briefEditable = canPrepareBrief(task)
  const reviewing = ['client_content_review', 'human', 'client_review'].includes(stage)
  const preparingContent = ['todo', 'running'].includes(stage)
  if (action === 'save_brief') {
    if (!briefEditable || !payload.brief || !payload.methods || !payload.knowledge)
      return '当前阶段不能编辑 Brief'
    const lockedKeys = new Set([...Object.keys(flow.brief), ...Object.keys(payload.brief)])
    lockedKeys.delete('contentInstruction')
    lockedKeys.delete('webSupplement')
    if ([...lockedKeys].some(key => JSON.stringify(payload.brief![key as keyof TaskBrief]) !== JSON.stringify(flow.brief[key as keyof TaskBrief])) || JSON.stringify(payload.methods) !== JSON.stringify(task.methods))
      return '客户可补充资料与说明，任务目标和专业方法由 AI 生成'
    return null
  }
  if (action === 'update_web_supplement')
    return (reviewing || preparingContent) && typeof payload.webSupplement === 'boolean' ? null : '当前阶段不能调整联网补充设置'
  if (action === 'confirm_brief')
    return !briefEditable ? '仅客户可确认待确认的 Brief' : briefGate(task).join('；') || null
  if (action === 'ignore_brief') {
    if (flow.ignoredBrief)
      return '本次审核事项已忽略'
    return briefEditable ? null : '仅客户可忽略待确认的 Brief'
  }
  if (action === 'defer_task') {
    if (isTaskIgnored(task))
      return '本次审核事项已忽略，不能暂不处理'
    if (stage === 'done')
      return '任务已完成，不能暂不处理'
    return canIgnoreCurrentStep(task) ? null : '当前步骤不能暂不处理'
  }
  if (action === 'resume_task')
    return isTaskDeferred(task) && canIgnoreCurrentStep(task) ? null : '当前步骤不能恢复处理'
  if (action === 'ignore_task') {
    if (isTaskIgnored(task))
      return '本次审核事项已忽略'
    if (stage === 'done')
      return '任务已完成，不能再忽略'
    return canIgnoreCurrentStep(task) ? null : '当前步骤不能忽略'
  }
  if (action === 'save_output')
    return !(reviewing || stage === 'site_failed') ? '当前阶段不能编辑产物' : payload.title?.trim() && payload.body?.trim() ? null : '产物标题和正文不能为空'
  if (action === 'approve_client') {
    if (!reviewing || !flow.output.body.trim()) return '请由客户审核完整产物'
    if (flow.output.externalClaims?.some(claim => !claim.confirmed && flow.output.body.includes(`data-external-claim-id="${claim.id}"`))) return '请先核对正文中标出的联网品牌信息'
    return null
  }
  if (action === 'return_content_review')
    return stage === 'site_submit' && (task.type === 'web' || task.type === 'external') ? null : '仅待提交的官网任务或待完成的外部内容可返回内容审核'
  if (action === 'submit_site')
    return (stage === 'site_submit' || (task.type === 'repair' && stage === 'human')) && task.type !== 'external' ? null : '仅客户可提交待提交的官网执行包'
  if (action === 'retry_site')
    return stage !== 'site_failed' ? '仅发布失败的任务可重试' : payload.note?.trim() ? null : '请补充调整要求'
  if (action === 'complete_delivery')
    return stage === 'site_submit' && task.type === 'external' ? null : '仅待完成的外部内容可完成交付'
  if (action === 'complete_recheck')
    return stage === 'recheck' && task.type === 'web' ? null : '当前任务不在官网核验阶段'
  return '不支持此操作'
}
export function applyAction(task: GeoTask, action: WorkflowAction, payload: WorkflowPayload = {}): string | null {
  const error = validateAction(task, action, payload)
  if (error)
    return error
  const flow = ensureWorkflow(task)
  const actor = '客户'
  const note = payload.note?.trim() || ''
  switch (action) {
    case 'save_brief':
      flow.brief = { ...payload.brief! }
      task.methods = [...new Set(payload.methods!.map(value => value.trim()).filter(Boolean))]
      flow.knowledge = payload.knowledge!.map(item => ({ ...item }))
      saveVersion(task, note || '修改 Brief、执行方法或知识资料')
      break
    case 'update_web_supplement':
      flow.brief.webSupplement = payload.webSupplement!
      saveVersion(task, '调整联网补充设置')
      break
    case 'confirm_brief':
      flow.briefStatus = 'confirmed'
      task.progress = task.executionKind === 'verification' ? 'human' : 'todo'
      break
    case 'defer_task': {
      const reason = payload.ignoreReason?.trim() || ''
      flow.deferredTask = { stage: task.progress, stageLabel: task.progress === 'brief' ? 'Task Brief 确认' : taskStageLabel(task), reason, explanation: note, actor, time: now() }
      break
    }
    case 'resume_task':
      flow.deferredTask = undefined
      break
    case 'ignore_brief':
    case 'ignore_task': {
      const reason = payload.ignoreReason?.trim() || ''
      const stageLabel = flow.deferredTask?.stageLabel ?? (task.progress === 'brief' ? 'Task Brief 确认' : taskStageLabel(task))
      const ignored = { stage: task.progress, stageLabel, reason, explanation: note, actor, time: now() }
      flow.ignoredTask = ignored
      flow.deferredTask = undefined
      if (task.progress === 'brief')
        flow.ignoredBrief = { reason: ignored.reason, explanation: ignored.explanation, actor, time: ignored.time }
      break
    }
    case 'save_output':
      flow.output = { ...flow.output, title: payload.title!.trim(), body: payload.body!.trim(), revision: flow.output.revision + 1 }
      saveVersion(task, '人工修改产物')
      if (task.progress === 'site_failed') {
        flow.site.result = '已根据发布失败结果修改内容，等待重新完成内容质检与最终稿确认。'
        flow.site.simulateFailure = false
        task.progress = 'client_review'
      }
      break
    case 'approve_client':
      task.progress = 'site_submit'
      if (task.type !== 'external')
        flow.site.requirements = `${flow.brief.executionTarget}\n${flow.brief.acceptance}`
      break
    case 'return_content_review':
      task.progress = 'client_review'
      break
    case 'submit_site':
    case 'retry_site':
      flow.site.requirements += note ? `\n调整要求：${note}` : ''
      flow.site.simulateFailure = payload.simulateFailure ?? false
      flow.site.attempts += 1
      task.progress = 'site_submitted'
      break
    case 'complete_delivery':
      task.progress = 'done'
      break
    case 'complete_recheck':
      task.progress = 'done'
      break
  }
  const labels: Record<WorkflowAction, string> = { save_brief: '保存 Brief 新版本', update_web_supplement: `联网补充已${payload.webSupplement ? '开启' : '关闭'}`, confirm_brief: '确认 Brief，进入自动执行', ignore_brief: '忽略本次审核事项', ignore_task: '忽略本次审核事项', defer_task: '暂不处理本次审核事项', resume_task: '恢复处理本次审核事项', save_output: '保存产物修改', approve_client: task.type === 'external' ? '外部内容确认，等待完成交付；不跟踪外部发布 URL' : '客户确认内容，等待提交 AI 建站执行包', return_content_review: '返回内容审核修改', submit_site: '提交 AI 建站执行包', retry_site: '补充要求并重新提交', complete_delivery: '完成外部内容交付', complete_recheck: '监测 Agent 完成本次官网核验，任务闭环' }
  const detail = action === 'ignore_brief' || action === 'ignore_task' || action === 'defer_task'
    ? [payload.ignoreReason?.trim(), note].filter(Boolean).join('；')
    : note
  record(task, actor, `${labels[action]}${detail ? `：${detail}` : ''}`)
  return null
}
export function hasAutomaticStep(task: GeoTask) {
  if (isDirectRepairTask(task))
    return task.progress !== 'done'
  if (isTaskIgnored(task) || isTaskDeferred(task))
    return false
  return ['todo', 'running', 'site_submitted', 'site_running', 'site_verifying'].includes(task.progress)
}
/** One local demo step, called by a disposable timer. No external requests or publishing. */
export function advanceAutomatic(task: GeoTask) {
  const flow = ensureWorkflow(task)
  if (isTaskDeferred(task))
    return false
  if (isDirectRepairTask(task)) {
    if (task.progress === 'done') return false
    flow.ignoredTask = undefined
    flow.ignoredBrief = undefined
    flow.site.attempts = Math.max(1, flow.site.attempts)
    task.progress = task.progress === 'site_running' ? 'done' : 'site_running'
    if (task.progress === 'done')
      flow.site.result = 'AI 建站已完成技术修复与验证记录。'
    record(task, 'AI 建站', directRepairStatus(task.progress === 'done'))
    return true
  }
  if (isTaskIgnored(task))
    return false
  const publishFailed = task.progress === 'site_verifying' && flow.site.simulateFailure
  // A failed website publish returns straight to content optimisation instead
  // of leaving the task parked on a separate failure step.
  const rollbackToContent = publishFailed && task.type === 'web'
  const transitions: Partial<Record<TaskProgress, TaskProgress>> = {
    todo: 'running',
    running: 'client_review',
    site_submitted: 'site_running',
    site_running: 'site_verifying',
    site_verifying: publishFailed ? (rollbackToContent ? 'client_review' : 'site_failed') : 'done',
  }
  const next = transitions[task.progress]
  if (!next)
    return false
  const previous = task.progress
  if (task.progress === 'running') {
    flow.output.body = buildDraftBody(task, flow)
    flow.output.externalClaims = []
    flow.output.revision += 1
    saveVersion(task, '生成内容草稿与自动检查')
  }
  if (task.progress === 'site_verifying') {
    flow.site.result = publishFailed
      ? '发布失败：执行结果与验收条件存在差异，已退回到修改板块，可以执行修改操作或重新提交。'
      : '发布成功：内容已发布到官网。'
    if (rollbackToContent)
      flow.site.simulateFailure = false
  }
  task.progress = next
  const automaticNote = previous === 'site_verifying'
    ? flow.site.result
    : previous === 'running'
      ? `完成内容生成、段落问题检查与 AI 质检；${taskStageLabel(task)}`
      : next === 'done'
        ? isCodeContentTask(task)
          ? '代码内容已发布，GEO 验证通过；任务完成。'
          : '发布完成；任务已闭环。'
        : `自动进入：${taskStageLabel(task)}`
  record(task, '系统', automaticNote)
  return true
}

/** Close website work that was never submitted when a newer monitoring round begins. */
export function expireUnsubmittedWebsiteTasks(tasks: GeoTask[]) {
  const submittedStages: TaskProgress[] = ['site_submitted', 'site_running', 'site_returned', 'site_verifying', 'site_publish', 'site_failed', 'publish', 'recheck']
  const expired: string[] = []
  for (const task of tasks) {
    if (task.origin === 'standalone' || task.type === 'external' || task.executionKind === 'verification') continue
    if (task.progress === 'done' || submittedStages.includes(task.progress) || isTaskIgnored(task) || isTaskDeferred(task)) continue
    task.progress = 'done'
    task.completionOutcome = 'expired-unexecuted'
    record(task, '系统', '新一轮监测已生成；本任务在时限内未提交官网，按规则关闭，未执行优化。')
    expired.push(task.id)
  }
  return expired
}
export function getTaskBucket(task: GeoTask): TaskBucket {
  if (isDirectRepairTask(task))
    return task.progress === 'done' ? 'done' : 'executing'
  if (isTaskIgnored(task))
    return 'ignored'
  if (isTaskDeferred(task))
    return 'deferred'
  if (task.progress === 'done')
    return 'done'
  if (task.progress === 'brief')
    return 'brief'
  if (['todo', 'running'].includes(task.progress))
    return 'executing'
  if (['client_content_review', 'human', 'client_review'].includes(task.progress))
    return 'review'
  if (task.progress === 'site_submit' && task.type === 'external')
    return 'review'
  return 'website'
}
export function taskStageLabel(task: GeoTask): string {
  if (task.executionKind === 'verification') return task.progress === 'brief' ? '核查 Brief 待确认' : task.progress === 'done' ? '核查已完成' : '待客户核查'
  if (isDirectRepairTask(task))
    return directRepairStatus(task.progress === 'done')
  if (isTaskIgnored(task))
    return '已忽略'
  if (isTaskDeferred(task))
    return '已暂不处理'
  if (task.progress === 'brief')
    return 'Brief 待确认'
  const labels: Record<Exclude<TaskProgress, 'brief'>, string> = { todo: '等待 Agent 执行', running: 'Agent 生成与自动质检', client_content_review: '待客户审核', human: task.type === 'repair' ? '待客户确认修复' : '待客户审核', client_review: '待客户审核', publish: '发布确认', site_submit: task.type === 'external' ? '待完成内容交付' : '待提交 AI 建站', site_submitted: 'AI 建站审核中', site_running: task.type === 'repair' ? '等待官网处理结果' : 'AI 建站执行中', site_returned: '官网已返回处理结果', site_verifying: '等待发布结果', site_publish: '发布结果', site_failed: '发布失败', recheck: 'Re-check 中', done: '任务已完成' }
  return labels[task.progress]
}
export function collaborationLabel(task: GeoTask): string {
  if (isDirectRepairTask(task))
    return directRepairStatus(task.progress === 'done')
  if (isTaskIgnored(task))
    return '已忽略'
  if (isTaskDeferred(task))
    return '已暂不处理'
  if (task.progress === 'done')
    return '完成'
  if (hasAutomaticStep(task))
    return 'Agent 处理中'
  if (task.progress === 'site_failed')
    return '发布失败'
  return '待用户审核'
}

