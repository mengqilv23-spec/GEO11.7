import type { GeoTask } from '../data/geo-data'
import { describe, expect, it } from 'vitest'
import { advanceAutomatic, applyAction, canEditBrief, ensureWorkflow, getTaskBucket, hasAutomaticStep, isTaskIgnored, knowledgeLibrary, reviewOwner, taskStageLabel } from './task-workflow'

function makeTask(type: GeoTask['type'], progress: GeoTask['progress']): GeoTask {
  return {
    id: 'T-TEST',
    name: '任务',
    type,
    source: 'F1',
    strategy: 'GS1',
    persona: '采购',
    factor: '服务能力',
    methods: ['内容补充'],
    destination: '官网内容',
    progress,
    relatedStrategies: ['GS1'],
  }
}

describe('prototype task ownership and backend-driven repair status', () => {
  it('describes the actual content channel and keeps verification separate from publication', () => {
    const website = makeTask('web', 'brief')
    website.name = '航空采购 FAQ 与产能表'
    expect(ensureWorkflow(website).brief.executionTarget).toBe('官网发布或更新《航空采购 FAQ 与产能表》相关内容')

    const linkedin = makeTask('external', 'brief')
    linkedin.name = 'LinkedIn 工程师专栏'
    linkedin.destination = '外部内容'
    expect(ensureWorkflow(linkedin).brief.executionTarget).toBe('领英发布《LinkedIn 工程师专栏》相关内容')

    const verification = makeTask('web', 'brief')
    verification.name = '核查：德国本地服务能力'
    verification.executionKind = 'verification'
    verification.destination = '核查记录'
    const flow = ensureWorkflow(verification)
    expect(flow.brief.executionTarget).toContain('核查「德国本地服务能力」')
    flow.brief.executionTarget = '核查记录'
    expect(ensureWorkflow(verification).brief.executionTarget).toContain('核查「德国本地服务能力」')
    flow.brief.executionTarget = '人工指定的核查对象'
    expect(ensureWorkflow(verification).brief.executionTarget).toBe('人工指定的核查对象')
  })

  it('restores editability for a saved Brief missing its status', () => {
    const task = makeTask('web', 'brief')
    const workflow = ensureWorkflow(task)
    Reflect.deleteProperty(workflow, 'briefStatus')

    const restored = ensureWorkflow(task)

    expect(restored.briefStatus).toBe('ready')
    expect(canEditBrief(task, 'ops', 'managed')).toBe(true)
    expect(canEditBrief(task, 'client', 'managed')).toBe(false)
  })

  it('rejects customer-side Brief edits and routes draft changes through operations', () => {
    const task = makeTask('web', 'brief')
    const flow = ensureWorkflow(task)
    const payload = { brief: flow.brief, methods: task.methods, knowledge: flow.knowledge }

    expect(applyAction(task, 'client', 'managed', 'save_brief', payload)).toContain('不能编辑 Brief')
    expect(applyAction(task, 'client', 'managed', 'request_brief_changes', { note: '请调整' })).toContain('仅运营')
    expect(applyAction(task, 'client', 'managed', 'ignore_task', { ignoreReason: '其他', note: '说明' })).toContain('当前步骤负责人')
    expect(applyAction(task, 'ops', 'managed', 'save_brief', payload)).toBeNull()
  })

  it('routes managed content review to operations before the customer review', () => {
    expect(reviewOwner(makeTask('web', 'human'), 'managed')).toBe('ops')
    expect(reviewOwner(makeTask('external', 'human'), 'managed')).toBe('ops')
    expect(reviewOwner(makeTask('external', 'client_review'), 'managed')).toBe('client')
  })

  it('sends an external draft from operations review to customer final confirmation', () => {
    const task = makeTask('external', 'human')
    ensureWorkflow(task)

    expect(applyAction(task, 'ops', 'managed', 'approve_ops')).toBeNull()
    expect(task.progress).toBe('client_review')
  })

  it('completes a website task when customer final approval receives the simulated site success', () => {
    const task = makeTask('web', 'client_review')
    const flow = ensureWorkflow(task)

    expect(applyAction(task, 'client', 'managed', 'approve_client')).toBeNull()

    expect(task.progress).toBe('done')
    expect(flow.site.requirements).toContain(flow.brief.executionTarget)
    expect(flow.reviews.at(-1)?.note).toContain('建站接口模拟成功')
    expect(getTaskBucket(task)).toBe('done')
  })

  it('auto-completes legacy site submission tasks as a simulated successful API response', () => {
    const task = makeTask('web', 'site_submit')
    const flow = ensureWorkflow(task)

    expect(hasAutomaticStep(task)).toBe(true)
    expect(advanceAutomatic(task)).toBe(true)

    expect(task.progress).toBe('done')
    expect(flow.reviews.at(-1)?.note).toContain('建站接口模拟成功')
  })

  it('routes generated external content through customer review before operations review', () => {
    const task = makeTask('external', 'running')
    ensureWorkflow(task)

    expect(advanceAutomatic(task)).toBe(true)
    expect(task.progress).toBe('client_content_review')
    expect(reviewOwner(task, 'managed')).toBe('client')
    expect(applyAction(task, 'client', 'managed', 'approve_client')).toBeNull()
    expect(task.progress).toBe('human')
    expect(reviewOwner(task, 'managed')).toBe('ops')
  })

  it('lets only the current reviewer update the web supplement setting and records the change', () => {
    const task = makeTask('web', 'client_review')
    const flow = ensureWorkflow(task)
    flow.brief.webSupplement = true
    const versionsBefore = flow.versions.length

    expect(applyAction(task, 'ops', 'managed', 'update_web_supplement', { webSupplement: false })).toContain('不能调整')
    expect(applyAction(task, 'client', 'managed', 'update_web_supplement', { webSupplement: false })).toBeNull()
    expect(task.progress).toBe('client_review')
    expect(flow.brief.webSupplement).toBe(false)
    expect(flow.versions).toHaveLength(versionsBefore + 1)
    expect(flow.reviews.at(-1)?.note).toContain('联网补充已关闭')
  })

  it('lets the customer adjust web supplementation during content preparation', () => {
    const task = makeTask('web', 'todo')
    const flow = ensureWorkflow(task)

    expect(applyAction(task, 'client', 'managed', 'update_web_supplement', { webSupplement: false })).toBeNull()
    expect(flow.brief.webSupplement).toBe(false)
    expect(task.progress).toBe('todo')
  })

  it('lets operations ignore a Brief without advancing or changing source diagnosis', () => {
    const task = makeTask('web', 'brief')
    const flow = ensureWorkflow(task)
    const reason = 'Agent 判断错误 / 策略不适用'

    expect(applyAction(task, 'client', 'managed', 'ignore_brief', { ignoreReason: reason, note: '当前业务不适用' })).toContain('仅运营')
    expect(applyAction(task, 'ops', 'managed', 'ignore_brief', { ignoreReason: reason, note: '当前业务不适用' })).toBeNull()

    expect(task.progress).toBe('brief')
    expect(task.source).toBe('F1')
    expect(task.strategy).toBe('GS1')
    expect(flow.ignoredBrief).toMatchObject({ reason, explanation: '当前业务不适用', actor: '运营' })
    expect(getTaskBucket(task)).toBe('ignored')
    expect(taskStageLabel(task)).toBe('已忽略')
    expect(flow.reviews.at(-1)?.note).toContain(`忽略本次审核事项：${reason}；当前业务不适用`)
  })

  it('requires an operations-owned ready Brief and both ignore fields', () => {
    const task = makeTask('web', 'brief')
    ensureWorkflow(task)

    expect(applyAction(task, 'client', 'managed', 'ignore_brief')).toContain('仅运营')
    expect(applyAction(task, 'ops', 'managed', 'ignore_brief', { ignoreReason: '其他' })).toContain('忽略说明')
    expect(applyAction(task, 'ops', 'managed', 'ignore_brief', { ignoreReason: '其他', note: '说明' })).toBeNull()
    expect(applyAction(task, 'ops', 'managed', 'ignore_brief', { ignoreReason: '其他', note: '再次提交' })).toContain('已忽略')
  })

  it('allows operations to confirm a ready Brief while keeping the customer read-only', () => {
    const task = makeTask('web', 'brief')
    ensureWorkflow(task).knowledge.push({ ...knowledgeLibrary[0]! })

    expect(applyAction(task, 'client', 'managed', 'confirm_brief')).toContain('仅运营')
    expect(applyAction(task, 'ops', 'managed', 'confirm_brief')).toBeNull()
    expect(task.progress).toBe('todo')
  })

  it('allows a direct AI instruction to satisfy the content-source requirement', () => {
    const task = makeTask('web', 'brief')
    const flow = ensureWorkflow(task)
    flow.brief.webSupplement = false
    flow.brief.contentInstruction = '重点介绍本地服务，不补充未经确认的承诺。'

    expect(applyAction(task, 'ops', 'managed', 'confirm_brief')).toBeNull()
    expect(task.progress).toBe('todo')
  })

  it('rejects Brief confirmation when both knowledge and direct instructions are empty', () => {
    const task = makeTask('web', 'brief')
    ensureWorkflow(task).brief.webSupplement = false

    expect(applyAction(task, 'ops', 'managed', 'confirm_brief')).toContain('选择知识资料、填写补充说明或勾选联网补充')
    expect(task.progress).toBe('brief')
  })

  it('requires one content source for structure-only tasks as well', () => {
    const task = makeTask('web', 'brief')
    task.name = '官网结构优化'
    task.methods = ['页面结构优化']
    ensureWorkflow(task).brief.webSupplement = false

    expect(applyAction(task, 'ops', 'managed', 'confirm_brief')).toContain('选择知识资料、填写补充说明或勾选联网补充')
  })

  it('allows web supplementation to satisfy the content-source requirement', () => {
    const task = makeTask('web', 'brief')
    ensureWorkflow(task).brief.webSupplement = true

    expect(applyAction(task, 'ops', 'managed', 'confirm_brief')).toBeNull()
    expect(task.progress).toBe('todo')
  })

  it('migrates saved Brief ignore records to the shared ignored-step state', () => {
    const task = makeTask('web', 'brief')
    const flow = ensureWorkflow(task)
    flow.ignoredBrief = { reason: '事实 / 证据不足', explanation: '旧记录', actor: '客户', time: '2026-10-13T00:00:00.000Z' }

    const restored = ensureWorkflow(task)

    expect(restored.ignoredTask).toMatchObject({ stage: 'brief', stageLabel: 'Task Brief 确认', reason: '事实 / 证据不足' })
    expect(isTaskIgnored(task)).toBe(true)
  })

  it('lets the current step owner ignore a later step and records which step was ignored', () => {
    const task = makeTask('web', 'human')
    const flow = ensureWorkflow(task)

    expect(applyAction(task, 'ops', 'managed', 'ignore_task', { ignoreReason: '事实 / 证据不足', note: '当前阶段资料不足。' })).toBeNull()

    expect(flow.ignoredTask).toMatchObject({
      stage: 'human',
      stageLabel: '运营专业审核',
      reason: '事实 / 证据不足',
      explanation: '当前阶段资料不足。',
      actor: '运营',
    })
    expect(getTaskBucket(task)).toBe('ignored')
    expect(taskStageLabel(task)).toBe('已忽略')
  })

  it('restricts ignoring to the current step owner and rejects terminal tasks', () => {
    const task = makeTask('web', 'human')
    ensureWorkflow(task)

    expect(applyAction(task, 'client', 'managed', 'ignore_task', { ignoreReason: '其他', note: '说明' })).toContain('当前步骤负责人')
    expect(applyAction(task, 'ops', 'managed', 'ignore_task', { ignoreReason: '其他', note: '说明' })).toBeNull()
    expect(applyAction(task, 'ops', 'managed', 'ignore_task', { ignoreReason: '其他', note: '再次忽略' })).toContain('已忽略')

    const completed = makeTask('web', 'done')
    ensureWorkflow(completed)
    expect(applyAction(completed, 'ops', 'managed', 'ignore_task', { ignoreReason: '其他', note: '说明' })).toContain('已完成')
  })

  it('prevents an ignored automatic step from resuming or advancing', () => {
    const task = makeTask('web', 'running')
    ensureWorkflow(task)

    expect(applyAction(task, 'client', 'managed', 'ignore_task', { ignoreReason: '其他', note: '本次不再执行。' })).toBeNull()
    expect(hasAutomaticStep(task)).toBe(false)
    expect(advanceAutomatic(task)).toBe(false)
    expect(task.progress).toBe('running')
  })

  it.each(['agent', 'managed'] as const)('automatically completes direct repair in %s without approval', (mode) => {
    const task = makeTask('repair', 'human')
    ensureWorkflow(task)
    expect(hasAutomaticStep(task, mode)).toBe(true)
    expect(applyAction(task, 'client', mode, 'submit_site')).toContain('无需人工操作')
    expect(taskStageLabel(task, mode)).toBe('AI建站处理中')
    advanceAutomatic(task, mode)
    expect(task.progress).toBe('site_running')
    advanceAutomatic(task, mode)
    expect(taskStageLabel(task, mode)).toBe('已完成处理')
    expect(getTaskBucket(task)).toBe('done')
    expect(hasAutomaticStep(task, mode)).toBe(false)
  })

  it('keeps Re-check waiting for an explicit monitoring completion action', () => {
    const task = makeTask('web', 'recheck')
    const flow = ensureWorkflow(task)

    expect(hasAutomaticStep(task)).toBe(false)
    expect(applyAction(task, 'ops', 'managed', 'complete_recheck')).toBeNull()
    expect(task.progress).toBe('done')
    expect(flow.reviews.at(-1)?.note).toContain('完成本次官网核验')
  })

  it('lets the client confirm publishing without requiring a URL in the prototype', () => {
    const task = makeTask('web', 'site_publish')
    ensureWorkflow(task)

    expect(applyAction(task, 'client', 'managed', 'publish')).toBeNull()
    expect(task.progress).toBe('recheck')
  })

  it('normalizes legacy repair execution fields to the technical-repair package', () => {
    const task = makeTask('repair', 'site_running')
    const workflow = ensureWorkflow(task)
    workflow.site.targetPage = '目标内容页'
    workflow.site.changeType = '官网内容新增 / 更新'
    workflow.site.factBoundary = '使用客户终审版本；不得扩写未确认的价格、交期、认证和服务承诺'

    const normalized = ensureWorkflow(task)

    expect(normalized.site.targetPage).toBe('相关官网页面 / 全站实体配置')
    expect(normalized.site.changeType).toBe('技术修复')
    expect(normalized.site.factBoundary).toBe('不得改写已确认的企业、认证与产品事实')
  })
})

// These paths exercise the new customer-only flow while the existing tests protect managed mode.
describe('customer-only review journeys', () => {
  it.each(['web', 'external'] as const)('completes %s after one customer review without an operations handoff', (type) => {
    const task = makeTask(type, 'brief')
    const flow = ensureWorkflow(task)
    flow.brief.webSupplement = true
    expect(applyAction(task, 'client', 'agent', 'confirm_brief')).toBeNull()
    advanceAutomatic(task, 'agent')
    advanceAutomatic(task, 'agent')
    expect(task.progress).toBe('client_review')
    expect(applyAction(task, 'client', 'agent', 'approve_client')).toBeNull()
    if (type === 'web') {
      expect(task.progress).toBe('site_submitted')
      advanceAutomatic(task, 'agent')
      advanceAutomatic(task, 'agent')
      advanceAutomatic(task, 'agent')
    }
    expect(task.progress).toBe('done')
    expect(flow.reviews.some(item => item.actor === '运营')).toBe(false)
    expect(flow.output.body).toContain('任务目标')
  })

  it('allows knowledge and instruction supplements while protecting AI-defined methods and goals', () => {
    const task = makeTask('web', 'brief')
    const flow = ensureWorkflow(task)
    const body = { brief: { ...flow.brief, contentInstruction: '使用已确认服务范围' }, methods: [...task.methods], knowledge: [{ ...knowledgeLibrary[0]! }] }
    expect(applyAction(task, 'client', 'agent', 'save_brief', body)).toBeNull()
    expect(flow.brief.contentInstruction).toBe('使用已确认服务范围')
    expect(applyAction(task, 'client', 'agent', 'save_brief', { ...body, methods: ['未经确认的方法'] })).toContain('专业方法')
    expect(applyAction(task, 'client', 'agent', 'save_brief', { ...body, brief: { ...body.brief, goal: '替换目标' } })).toContain('专业方法')
    expect(applyAction(task, 'ops', 'agent', 'confirm_brief')).toContain('客户角色')
  })

  it('returns customer change requests to the same review step', () => {
    const task = makeTask('external', 'client_review')
    ensureWorkflow(task)
    expect(applyAction(task, 'client', 'agent', 'request_output_changes', { note: '保留已确认的服务范围' })).toBeNull()
    advanceAutomatic(task, 'agent')
    expect(task.progress).toBe('client_review')
    expect(task.workflow!.output.body).toContain('保留已确认的服务范围')
    expect(applyAction(task, 'client', 'agent', 'approve_client')).toBeNull()
    expect(task.progress).toBe('done')
  })

  it('keeps factual conflicts requiring confirmation and supports retry', () => {
    const task = makeTask('repair', 'human')
    task.source = 'F9'
    const flow = ensureWorkflow(task)
    expect(hasAutomaticStep(task, 'agent')).toBe(false)
    expect(applyAction(task, 'client', 'agent', 'submit_site', { simulateFailure: true })).toBeNull()
    for (let i = 0; i < 3; i++) advanceAutomatic(task, 'agent')
    expect(task.progress).toBe('site_failed')
    expect(applyAction(task, 'client', 'agent', 'retry_site', { note: '仅更新已确认的结构字段', simulateFailure: false })).toBeNull()
    for (let i = 0; i < 3; i++) advanceAutomatic(task, 'agent')
    expect(task.progress).toBe('done')
    expect(flow.site.attempts).toBe(2)
    expect(flow.site.requirements).toContain('仅更新已确认的结构字段')
  })

  it('keeps an ignored customer Brief from running and records the customer decision', () => {
    const task = makeTask('web', 'brief')
    ensureWorkflow(task)
    expect(applyAction(task, 'client', 'agent', 'ignore_task', { ignoreReason: '时机不合适', note: '待下次排期确认' })).toBeNull()
    expect(hasAutomaticStep(task, 'agent')).toBe(false)
    expect(advanceAutomatic(task, 'agent')).toBe(false)
    expect(task.workflow!.ignoredTask?.actor).toBe('客户')
  })
})

