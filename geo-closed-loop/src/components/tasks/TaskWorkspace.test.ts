import type { GeoWorkbenchRouteContext } from '../../composables/workbench-route-context'
import type { GeoTask } from '../../data/geo-data'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { geoWorkbenchRouteContextKey } from '../../composables/workbench-route-context'
import { auditFindings, officialContentSnapshot } from '../../data/geo-data'
import { advanceAutomatic, applyAction, ensureWorkflow, knowledgeLibrary } from '../../workflows/task-workflow'
import TaskWorkspace from './TaskWorkspace.vue'

function makeTask(): GeoTask {
  return {
    id: 'T-2402',
    name: '航空采购 FAQ 与产能表 Brief',
    type: 'web',
    source: 'F3',
    strategy: 'GS10',
    persona: '航空采购',
    factor: '交付稳定性',
    methods: ['交期 FAQ'],
    destination: '官网内容',
    progress: 'brief',
    relatedStrategies: ['GS10'],
  }
}

function mountWorkspace(role: 'ops' | 'client', task = makeTask(), openFlow = vi.fn(), clientPreview = false, serviceMode: 'managed' | 'agent' = 'managed') {
  const routeContext = { openFlow } as unknown as GeoWorkbenchRouteContext
  return mount(TaskWorkspace, {
    props: { task, role, serviceMode, clientPreview },
    global: {
      provide: { [geoWorkbenchRouteContextKey as symbol]: routeContext },
      stubs: {
        TaskSiteCollaboration: {
          template: '<section data-test="site-collaboration">AI 建站执行</section>',
        },
        Tooltip: { template: '<div><slot /></div>' },
        Drawer: {
          props: ['open', 'title', 'eyebrow'],
          template: '<div v-if="open" data-test="drawer"><p>{{ eyebrow }}</p><h2>{{ title }}</h2><slot /><footer><slot name="footer" /></footer></div>',
        },
        DropdownSelect: {
          props: ['modelValue', 'options', 'ariaLabel'],
          emits: ['update:modelValue'],
          template: '<select :aria-label="ariaLabel || \'忽略原因\'" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">请选择</option><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
        },
      },
    },
  })
}

describe('task workspace task confirmation', () => {
  it('saves the AI instruction without confirming the Brief and restores an unfinished local draft', async () => {
    const task = makeTask()
    task.id = 'T-DRAFT-TEST'
    const first = mountWorkspace('ops', task)
    await first.get('.tw-content-basis textarea').setValue('先核对品牌资料')
    expect(window.localStorage.getItem('geo-task-draft:managed:ops:T-DRAFT-TEST')).toContain('先核对品牌资料')
    first.unmount()

    const restored = mountWorkspace('ops', task)
    expect((restored.get('.tw-content-basis textarea').element as HTMLTextAreaElement).value).toBe('先核对品牌资料')
    await restored.get('[data-test="save-brief-draft"]').trigger('click')
    expect(task.workflow?.brief.contentInstruction).toBe('先核对品牌资料')
    expect(task.progress).toBe('brief')
    expect(restored.find('.tw-draft-save-row').exists()).toBe(false)
    expect(restored.findAll('.tw-brief-confirm .tw-actions button').map(button => button.text())).toEqual(['保存', '忽略', '专家审核通过并生成内容'])
    expect(window.localStorage.getItem('geo-task-draft:managed:ops:T-DRAFT-TEST')).toBeNull()
  })

  it('removes an AI-matched knowledge tag directly from the Brief', async () => {
    const task = reactive(makeTask())
    const flow = ensureWorkflow(task)
    flow.knowledge = [{ ...knowledgeLibrary[0]! }]
    const wrapper = mountWorkspace('ops', task)

    expect(wrapper.get('.tw-knowledge-tag').text()).toContain(knowledgeLibrary[0]!.title)
    await wrapper.get('.tw-knowledge-tag__remove').trigger('click')

    expect(task.workflow?.knowledge).toHaveLength(0)
    expect(wrapper.find('.tw-knowledge-tag').exists()).toBe(false)
    expect(wrapper.get('.tw-content-basis__empty').text()).toContain('没有检索到相关资料')
  })

  it('shows the current address finding and website modification scope for saved F9 tasks', () => {
    const task = makeTask()
    task.origin = 'geo-audit'
    task.source = 'F9'
    task.sourceKind = 'geo-audit-content'
    task.auditContent = { abnormality: '演示核对：旧说明', originalContent: '' }
    const wrapper = mountWorkspace('client', task)
    const summary = wrapper.get('.tw-brief-summary')

    expect(summary.text()).toContain('官网有关企业地址的文字描述')
    expect(summary.text()).toContain('可能使 AI 难以准确识别企业所在地')
    expect(summary.text()).toContain('官网：核对并更新企业地址相关文字描述')
    expect(summary.text()).not.toContain('演示核对：旧说明')
  })

  it('uses the audited task origin rather than the source ID or title to choose the Brief summary', () => {
    const task = makeTask()
    task.origin = 'geo-audit'
    task.name = '碳纤维切割能力页缺少适用条件'
    task.source = 'FC-01'
    task.sourceKind = 'geo-audit-content'
    task.auditContent = officialContentSnapshot(auditFindings.find(item => item.id === 'FC-01')!)
    const wrapper = mountWorkspace('client', task)
    const summary = wrapper.get('.tw-brief-summary')

    expect(summary.text()).toContain('问题描述')
    expect(summary.text()).toContain('解决方案')
    expect(summary.text()).toContain('官网：围绕')
    expect(summary.text()).not.toContain('目标人设')
    expect(summary.text()).not.toContain('买家关注点')
    wrapper.unmount()

    task.origin = 'buyer-coverage'
    delete task.sourceKind
    delete task.auditContent
    const strategyWrapper = mountWorkspace('client', task)
    expect(strategyWrapper.get('.tw-brief-summary').text()).toContain('目标人设')
    expect(strategyWrapper.get('.tw-brief-summary').text()).not.toContain('解决方案')
    strategyWrapper.unmount()
  })

  it.each(['agent', 'managed'] as const)('uses the GEO audit writing summary in %s mode even for legacy tasks', (serviceMode) => {
    const task = makeTask()
    task.id = 'T-2501'
    task.origin = 'geo-audit'
    task.source = 'F8-2'
    task.name = '工程师专家档案实体统一与同名消歧'
    task.evidence = '当前作者页缺少经确认的工程师背景资料。'
    const wrapper = mountWorkspace(serviceMode === 'agent' ? 'client' : 'ops', task, vi.fn(), false, serviceMode)
    const summary = wrapper.get('.tw-brief-summary').text()

    expect(wrapper.get('.tw-count-badge').text()).toBe('T-2501')
    expect(summary).toContain('问题描述')
    expect(summary).toContain('解决方案')
    expect(summary).not.toContain('任务目标')
    expect(summary).not.toContain('目标人设')
    expect(summary).not.toContain('买家关注点')
    expect(summary).not.toContain('执行对象')
  })

  it('hides the bottom card during automatic execution but keeps the manual review action bar', () => {
    const automaticTask = makeTask()
    automaticTask.progress = 'todo'
    ensureWorkflow(automaticTask)
    const automaticView = mountWorkspace('ops', automaticTask)

    expect(automaticView.find('.tw-actionbar').exists()).toBe(false)
    automaticView.unmount()

    const reviewTask = makeTask()
    reviewTask.progress = 'human'
    ensureWorkflow(reviewTask)
    const reviewView = mountWorkspace('ops', reviewTask)

    expect(reviewView.get('[data-test="approve-output"]').text()).toBe('通过，交客户确认')
    reviewView.unmount()
  })

  it('keeps the back navigation and removes redundant flow links', () => {
    const wrapper = mountWorkspace('client')

    expect(wrapper.find('.tw-back-button svg.lucide-arrow-left').exists()).toBe(true)
    expect(wrapper.find('[data-test="open-full-flow"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('返回优化中心')
  })

  it('keeps a local operations/customer role switch available throughout the website workflow', async () => {
    for (const progress of ['site_submit', 'site_publish', 'recheck', 'done'] as const) {
      const task = makeTask()
      task.progress = progress
      ensureWorkflow(task)
      const wrapper = mountWorkspace('ops', task)

      expect(wrapper.get('[data-test="workflow-role-switch"]').text()).toContain('流程测试')
      expect(wrapper.get('[data-test="workflow-role-ops"]').attributes('aria-pressed')).toBe('true')
      expect(wrapper.get('[data-test="workflow-role-client"]').attributes('aria-pressed')).toBe('false')

      await wrapper.get('[data-test="workflow-role-client"]').trigger('click')
      expect(wrapper.emitted('setTestRole')?.at(-1)).toEqual(['client'])
    }
  })

  it('keeps the role test switch available for external-content tasks', async () => {
    const task = makeTask()
    task.type = 'external'
    task.destination = '外部内容'
    const wrapper = mountWorkspace('ops', task)

    expect(wrapper.get('[data-test="workflow-role-switch"]').text()).toContain('流程测试')
    await wrapper.get('[data-test="workflow-role-client"]').trigger('click')

    expect(wrapper.emitted('setTestRole')?.at(-1)).toEqual(['client'])
  })

  it('keeps Brief actions with operations and renders the customer view as read-only', async () => {
    const wrapper = mountWorkspace('ops')

    expect(wrapper.get('.tw-brief-confirm .tw-actions').text()).toContain('忽略')
    expect(wrapper.get('.tw-brief-confirm .tw-actions').text()).toContain('专家审核通过并生成内容')
    expect(wrapper.get('[data-test="workflow-role-client"]').attributes('aria-pressed')).toBe('false')
    await wrapper.setProps({ role: 'client', clientPreview: true })

    expect(wrapper.get('[data-test="workflow-role-client"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('.tw-actionbar').exists()).toBe(false)
    expect(wrapper.find('.tw-brief-confirm .tw-actions').exists()).toBe(false)
    expect(wrapper.find('.tw-brief-confirm [data-test="ignore-task"]').exists()).toBe(false)
    expect(wrapper.find('.tw-brief-confirm button').exists()).toBe(false)
    expect(wrapper.find('.tw-content-basis textarea').exists()).toBe(false)
    expect(wrapper.find('.tw-content-basis input[type="checkbox"]').exists()).toBe(false)
    expect(wrapper.findAll('.tw-suggestion-chip')).toHaveLength(4)
    expect(wrapper.findAll('.tw-suggestion-chip').every(chip => chip.element.tagName === 'SPAN')).toBe(true)
    expect(wrapper.find('.tw-content-basis__actions').exists()).toBe(false)

    const reviewTask = makeTask()
    reviewTask.progress = 'site_publish'
    const reviewIgnore = mountWorkspace('ops', reviewTask).get('.tw-actionbar [data-test="ignore-task"]')
    expect(reviewIgnore.attributes('data-variant')).toBe('secondary')
    expect(reviewIgnore.classes()).toContain('tw-ignore-action')
  })

  it('records the ignore reason and explanation, removes pending actions, and preserves diagnosis', async () => {
    const task = makeTask()
    const wrapper = mountWorkspace('ops', task)

    await wrapper.get('.tw-brief-confirm [data-test="ignore-task"]').trigger('click')
    expect(wrapper.get('[data-test="drawer"] h2').text()).toBe('绝对不处理（忽略）')
    expect(wrapper.get('[data-test="drawer"]').text()).toContain('来源诊断仍保留，官网异常不会因此变为通过。')
    expect((wrapper.get('[data-test="confirm-ignore"]').element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('[data-test="drawer"] select').setValue('Agent 判断错误 / 策略不适用')
    await wrapper.get('[data-test="ignore-explanation"]').setValue('本次目标与当前业务不匹配。')
    expect((wrapper.get('[data-test="confirm-ignore"]').element as HTMLButtonElement).disabled).toBe(false)
    await wrapper.get('[data-test="confirm-ignore"]').trigger('click')

    expect(task.progress).toBe('brief')
    expect(task.source).toBe('F3')
    expect(task.strategy).toBe('GS10')
    expect(task.workflow?.ignoredBrief).toMatchObject({
      reason: 'Agent 判断错误 / 策略不适用',
      explanation: '本次目标与当前业务不匹配。',
      actor: '专家',
    })
    expect(wrapper.find('[data-test="ignore-task"]').exists()).toBe(false)
    expect(wrapper.find('.tw-brief-confirm').exists()).toBe(false)
    expect(wrapper.get('.tw-actionbar').text()).toContain('已忽略「Task Brief 确认」：Agent 判断错误 / 策略不适用。本任务不再进入后续执行。')
    expect(wrapper.get('[data-test="return-optimization"]').text()).toBe('返回优化中心')
    wrapper.unmount()
  })

  it('lets the agent customer ignore without filling in a reason or explanation', async () => {
    const task = makeTask()
    task.type = 'external'
    task.progress = 'human'
    const wrapper = mountWorkspace('client', task, vi.fn(), false, 'agent')

    await wrapper.get('.tw-actionbar [data-test="ignore-task"]').trigger('click')
    expect(wrapper.get('[data-test="drawer"]').text().match(/可选/g)).toHaveLength(2)
    expect((wrapper.get('[data-test="confirm-ignore"]').element as HTMLButtonElement).disabled).toBe(false)

    await wrapper.get('[data-test="confirm-ignore"]').trigger('click')

    expect(task.workflow?.ignoredTask).toMatchObject({ reason: '', explanation: '', actor: '客户' })
    expect(wrapper.get('.tw-actionbar').text()).toContain('已忽略「待客户审核」。本任务不再进入后续执行。')
    expect(wrapper.find('.tw-actionbar [data-test="ignore-task"]').exists()).toBe(false)
  })

  it('provides the shared ignore flow in the bottom action bar for the current step owner', async () => {
    const task = makeTask()
    task.type = 'external'
    task.progress = 'human'
    const wrapper = mountWorkspace('ops', task)

    expect(wrapper.get('.tw-actionbar [data-test="ignore-task"]').text()).toBe('忽略')
    expect((wrapper.get('.tw-actionbar [data-test="ignore-task"]').element as HTMLButtonElement).disabled).toBe(false)

    await wrapper.get('.tw-actionbar [data-test="ignore-task"]').trigger('click')
    expect(wrapper.get('[data-test="drawer"] h2').text()).toBe('绝对不处理（忽略）')
    expect(wrapper.get('[data-test="drawer"]').text()).toContain('专家专业审核')
    await wrapper.get('[data-test="drawer"] select').setValue('事实 / 证据不足')
    await wrapper.get('[data-test="ignore-explanation"]').setValue('当前阶段资料不足。')
    await wrapper.get('[data-test="confirm-ignore"]').trigger('click')

    expect(task.workflow?.ignoredTask).toMatchObject({ stage: 'human', stageLabel: '专家专业审核', actor: '专家' })
    expect(wrapper.find('.tw-actionbar [data-test="ignore-task"]').exists()).toBe(false)
    expect(wrapper.get('.tw-actionbar').text()).toContain('已忽略「专家专业审核」')
  })

  it('resumes a previously deferred step from the action bar', async () => {
    const task = makeTask()
    task.type = 'external'
    task.progress = 'human'
    ensureWorkflow(task)
    expect(applyAction(task, 'ops', 'managed', 'defer_task', { ignoreReason: '其他', note: '等待客户补充认证材料。' })).toBeNull()
    const wrapper = mountWorkspace('ops', task)

    expect(wrapper.get('.tw-actionbar').text()).toContain('已暂不处理「专家专业审核」：其他')
    expect(wrapper.get('.tw-actionbar').text()).toContain('可恢复处理')
    expect(wrapper.find('.tw-actionbar [data-test="defer-task"]').exists()).toBe(false)
    expect(wrapper.get('.tw-actionbar [data-test="resume-task"]').text()).toBe('恢复处理')
    expect(wrapper.find('.tw-actionbar [data-test="ignore-task"]').exists()).toBe(true)

    await wrapper.get('.tw-actionbar [data-test="resume-task"]').trigger('click')

    expect(task.workflow?.deferredTask).toBeUndefined()
    expect(task.progress).toBe('human')
    expect(wrapper.find('.tw-actionbar [data-test="resume-task"]').exists()).toBe(false)
    expect(wrapper.find('.tw-actionbar [data-test="ignore-task"]').exists()).toBe(true)
  })

  it('offers only reject and approve at the customer final review', async () => {
    const task = makeTask()
    task.progress = 'client_review'
    ensureWorkflow(task)
    const wrapper = mountWorkspace('client', task)

    expect(wrapper.find('.tw-actionbar [data-test="defer-task"]').exists()).toBe(false)
    expect(wrapper.find('.tw-actionbar [data-test="ignore-task"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="reject-output"]').text()).toBe('拒绝')
    expect(wrapper.get('[data-test="approve-output"]').text()).toBe('通过')

    await wrapper.get('[data-test="reject-output"]').trigger('click')
    expect(wrapper.get('[data-test="drawer"] h2').text()).toBe('拒绝内容')
    expect(wrapper.get('[data-test="drawer"]').text()).toContain('内容为只读')
    const confirm = wrapper.get('[data-test="drawer"] footer button:last-child')
    expect(confirm.text()).toBe('确认拒绝')
    expect((confirm.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('[data-test="drawer"] textarea').setValue('未通过事实核对，退回重新生成。')
    await confirm.trigger('click')

    expect(task.progress).toBe('human')
    expect(task.workflow?.customerRevisionRequests).toBe(1)
    expect(task.workflow?.reviews.at(-1)?.note).toContain('拒绝当前内容，退回重新处理')
  })

  it('places the operations Brief ignore control beside confirmation and keeps other stages in the bottom bar', async () => {
    const brief = mountWorkspace('client')
    expect(brief.find('.tw-actionbar').exists()).toBe(false)
    expect(brief.find('.tw-brief-confirm [data-test="ignore-task"]').exists()).toBe(false)
    expect(brief.find('.tw-brief-confirm [data-test="ignore-brief"]').exists()).toBe(false)

    const operationsBrief = mountWorkspace('ops')
    expect(operationsBrief.find('.tw-actionbar').exists()).toBe(false)
    expect(operationsBrief.find('.tw-brief-confirm [data-test="ignore-task"]').exists()).toBe(true)

    const task = makeTask()
    task.progress = 'site_publish'
    const operationsView = mountWorkspace('ops', task)
    expect((operationsView.get('[data-test="ignore-task"]').element as HTMLButtonElement).disabled).toBe(true)

    const customerView = mountWorkspace('client', task)
    expect((customerView.get('[data-test="ignore-task"]').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows an enabled ignore control outside the read-only content review', () => {
    const ownerByStage = [
      ['brief', 'ops'],
      ['site_publish', 'client'],
      ['recheck', 'ops'],
    ] as const

    for (const [progress, owner] of ownerByStage) {
      const task = makeTask()
      task.progress = progress
      ensureWorkflow(task)
      const wrapper = mountWorkspace(owner, task)
      const ignoreControl = progress === 'brief'
        ? wrapper.get('.tw-brief-confirm [data-test="ignore-task"]')
        : wrapper.get('.tw-actionbar [data-test="ignore-task"]')

      expect(ignoreControl.text(), progress).toBe('忽略')
      expect((ignoreControl.element as HTMLButtonElement).disabled, progress).toBe(false)
      if (progress === 'brief')
        expect(wrapper.find('.tw-actionbar').exists(), progress).toBe(false)
      wrapper.unmount()
    }

    const readOnlyReview = makeTask()
    readOnlyReview.progress = 'human'
    const reviewWrapper = mountWorkspace('ops', readOnlyReview)
    expect(reviewWrapper.find('.tw-actionbar [data-test="ignore-task"]').exists()).toBe(false)
    expect(reviewWrapper.find('[data-test="reject-output"]').exists()).toBe(true)
  })

  it('renders the non-repair first step without an extra confirmation summary card', () => {
    const wrapper = mountWorkspace('ops')
    const overview = wrapper.get('.tw-overview')
    const content = wrapper.get('.tw-content-panel')
    expect(wrapper.get('.tw-task-detail.is-brief').element.contains(overview.element)).toBe(true)
    expect(wrapper.get('.tw-task-detail.is-brief').element.contains(content.element)).toBe(true)

    expect(overview.get('h1').text()).toBe('航空采购 FAQ 与产能表 Brief')
    expect(overview.get('.tw-task-id').text()).toBe('F3')
    expect(overview.find('.tw-flow-steps').exists()).toBe(true)
    expect(overview.get('.tw-count-badge').text()).toBe('T-2402')
    expect(overview.find('.tw-title-line .ce-tag').exists()).toBe(true)
    expect(content.find('.tw-flow-steps').exists()).toBe(false)
    expect(content.find('.tw-confirmation').exists()).toBe(false)
    expect(content.find('.tw-brief-workspace').exists()).toBe(true)
    expect(content.find('[data-test="site-collaboration"]').exists()).toBe(false)
  })

  it('shows the Brief workspace as the actual first step instead of hiding it behind collapsed details', () => {
    const task = makeTask()
    ensureWorkflow(task).knowledge.push({ ...knowledgeLibrary[0]! })
    const wrapper = mountWorkspace('ops', task)

    expect(wrapper.find('details.tw-more-details').exists()).toBe(false)
    expect(wrapper.find('.tw-confirmation').exists()).toBe(false)
    expect(wrapper.find('.tw-brief-permission').exists()).toBe(false)
    expect(wrapper.get('.tw-brief-workspace__head').text()).toContain('Task Brief 确认')
    expect(wrapper.get('.tw-brief-workspace__head').text()).toContain('V1')
    expect(wrapper.get('.tw-tabs').text()).not.toContain('生成内容')
    expect(wrapper.get('.tw-tabs').text()).toContain('Brief')
    expect(wrapper.get('.tw-gate.ready strong').text()).toBe('内容依据已准备完成')
    expect(wrapper.get('.tw-gate.ready p').text()).toBe('确认 Brief 后，Agent 将优先使用已匹配知识，并按需联网补充。')
    expect(wrapper.get('.tw-content-basis').element.contains(wrapper.get('.tw-gate.ready').element)).toBe(true)
    expect(wrapper.get('.tw-brief-workspace').find('.tw-brief-confirm').exists()).toBe(true)
    const fields = wrapper.findAll('.tw-brief--table dt')
    expect(fields.map(field => field.text())).toEqual(['任务目标', '目标人设', '买家关注点', '执行对象'])
    expect(wrapper.findAll('.tw-brief--table dd')).toHaveLength(4)
    expect(wrapper.get('.tw-brief-confirm').text()).not.toContain('现在需要运营')
    expect(wrapper.get('.tw-brief-confirm').text()).not.toContain('确认的是这次任务具体做什么')
    expect(wrapper.get('.tw-brief-confirm').text()).toContain('专家审核通过并生成内容')
    expect(wrapper.findAll('.tw-content-basis__actions button').map(button => button.text())).toEqual(['调整已有资料', '上传新资料'])
  })

  it('keeps the task flow visible without extra permission and navigation controls', () => {
    const openFlow = vi.fn()
    const wrapper = mountWorkspace('client', makeTask(), openFlow)

    expect(wrapper.find('.tw-permission-help').exists()).toBe(false)
    expect(wrapper.get('.tw-flow-head').text()).toContain('官网任务执行流程')
    expect(wrapper.get('.tw-flow-steps').text()).toContain('内容生成')
    expect(wrapper.find('[data-test="open-full-flow"]').exists()).toBe(false)
    expect(openFlow).not.toHaveBeenCalled()
  })

  it('renders content-basis controls and routes material actions to knowledge preparation', async () => {
    const wrapper = mountWorkspace('ops')

    expect(wrapper.get('.tw-content-basis').text()).toContain('内容依据')
    expect(wrapper.get('.tw-content-basis').text()).toContain('AI 自动匹配')
    expect(wrapper.get('.tw-content-basis').text()).toContain('建议再补充')
    expect(wrapper.get('.tw-content-basis textarea').attributes('placeholder')).toContain('重点介绍')
    expect(wrapper.find('.tw-content-basis input[type="checkbox"]').exists()).toBe(true)
    await wrapper.get('[data-test="adjust-materials"]').trigger('click')
    expect(wrapper.get('[data-test="drawer"] h2').text()).toBe('知识资料准备')
    expect(wrapper.find('[data-test="upload-file"]').exists()).toBe(false)
  })

  it('renders supplemental topics as non-interactive suggestions in a legacy Brief', async () => {
    const task = makeTask()
    task.id = 'T-2502'
    task.name = '日本代理合作与本地服务说明页'
    task.factor = '代理支持 / 本地服务'
    const workflow = ensureWorkflow(task)
    Reflect.deleteProperty(workflow, 'briefStatus')
    const wrapper = mountWorkspace('ops', task)

    expect(wrapper.findAll('.tw-suggestion-chip')).toHaveLength(4)
    const suggestions = wrapper.get('.tw-content-basis__line:nth-child(2) .tw-chip-list')
    expect(suggestions.text()).toContain('服务范围')
    expect(suggestions.element.querySelector('button')).toBeNull()
  })

  it('opens the dedicated upload flow from the content-basis action', async () => {
    const wrapper = mountWorkspace('ops')

    await wrapper.get('[data-test="upload-material"]').trigger('click')

    expect(wrapper.get('[data-test="drawer"] h2').text()).toBe('上传知识资料')
    expect(wrapper.get('[data-test="drawer"]').text()).toContain('此处只负责上传资料。上传完成后，请前往 AI 建站知识库进行内容解析；解析完成后，再从知识库刷新并选择。')
  })

  it('shows the demo handoff after submitting upload details without linking an unparsed file', async () => {
    const task = makeTask()
    const wrapper = mountWorkspace('ops', task)
    await wrapper.get('[data-test="upload-material"]').trigger('click')
    await wrapper.get('[aria-label="资料标签"]').setValue('品牌事实')
    await wrapper.get('[data-test="upload-name"]').setValue('产品规格资料')
    const input = wrapper.get('[data-test="upload-file"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [new File(['spec'], 'product.pdf', { type: 'application/pdf' })],
    })
    await input.trigger('change')
    await wrapper.get('[data-test="upload-file-submit"]').trigger('click')

    expect(wrapper.get('[data-test="upload-staged"]').text()).toContain('文件尚未实际上传')
    expect(wrapper.get('.tw-brief-confirm').text()).toContain('已登记「产品规格资料」的上传流程')
    expect(task.workflow?.knowledge).toEqual([])
  })

  it('keeps a single operations Brief confirmation action in the first-step card', async () => {
    const task = reactive(makeTask())
    ensureWorkflow(task).knowledge.push({ ...knowledgeLibrary[0]! })
    const wrapper = mountWorkspace('ops', task)
    await wrapper.get('.tw-content-basis textarea').setValue('重点说明日本本地服务，不编造交期承诺。')

    expect(wrapper.get('.tw-brief-confirm').text()).toContain('专家审核通过并生成内容')
    expect(wrapper.find('.tw-actionbar').exists()).toBe(false)
    expect(wrapper.find('.tw-brief-confirm [data-test="ignore-task"]').exists()).toBe(true)
    expect(wrapper.find('.tw-actionbar [data-test="confirm-brief"]').exists()).toBe(false)
    const confirm = wrapper.findAll('.tw-brief-confirm button').find(button => button.text().includes('专家审核通过并生成内容'))!
    await wrapper.get('.tw-back-button').trigger('click')
    expect(task.progress).toBe('brief')
    expect(task.workflow?.brief.contentInstruction).toBe('')
    expect(document.body.textContent).toContain('请确认已保存修改内容')
    expect(wrapper.emitted('back')).toBeUndefined()
    await wrapper.get('[data-test="save-brief-draft"]').trigger('click')
    await confirm.trigger('click')
    expect(task.progress).toBe('todo')
    expect(task.workflow?.briefStatus).toBe('confirmed')
    expect(task.workflow?.brief.contentInstruction).toBe('重点说明日本本地服务，不编造交期承诺。')
    expect(task.workflow?.brief.supplementalTopics).toEqual([])
    expect(task.workflow?.brief.webSupplement).toBe(true)
    expect(task.workflow?.versions.at(-1)?.brief.contentInstruction).toBe('重点说明日本本地服务，不编造交期承诺。')

    task.progress = 'human'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tw-actionbar .tw-success').exists()).toBe(false)
    expect(task.workflow?.reviews.at(-1)?.note).toBe('确认 Brief，进入自动执行')
  })

  it('renders the prototype repair detail fields and keeps returned state backend-driven', () => {
    const task = makeTask()
    task.id = 'T-2501'
    task.name = '工程师专家档案实体统一与同名消歧'
    task.source = 'F9'
    task.type = 'repair'
    task.destination = '技术修复'
    task.factor = '实体可信度'
    task.evidence = '正在扫描是否可复用“认证结构化、专家档案与 sameAs”修复任务。'
    task.methods = ['作者实体', '专家档案', 'sameAs 消歧']
    task.progress = 'site_running'
    const wrapper = mountWorkspace('ops', task)

    expect(wrapper.text()).toContain('GEO 体检信息')
    expect(wrapper.text()).toContain('处理方式')
    expect(wrapper.text()).toContain('所属检查项')
    expect(wrapper.text()).toContain('当前状态')
    expect(wrapper.text()).toContain('问题描述')
    expect(wrapper.text()).toContain('为什么这样处理')
    expect(wrapper.text()).toContain('技术方案及内容')
    expect(wrapper.find('[data-test="repair-result"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('官网处理中，等待结果回传')
    expect(wrapper.text()).not.toContain('技术修复已提交官网，正在等待官网返回处理结果。')
    expect(wrapper.text()).toContain('等待官网处理结果')
    expect(wrapper.findAll('.tw-flow-steps li')).toHaveLength(2)
    expect(wrapper.findAll('.tw-flow-steps li').map(step => step.text())).toEqual(['提交官网已提交', '2返回结果技术处理结果'])
    expect(wrapper.findAll('.tw-repair-section')).toHaveLength(1)
    expect(wrapper.get('.tw-task-id').text()).toBe(task.source)
    expect(wrapper.find('.tw-confirmation').exists()).toBe(false)
    expect(wrapper.find('[data-test="site-collaboration"]').exists()).toBe(false)
    expect(wrapper.find('.tw-tabs').exists()).toBe(false)
    expect(wrapper.find('.tw-actionbar').exists()).toBe(false)

    task.progress = 'site_returned'
    const returned = mountWorkspace('ops', task)
    expect(returned.find('[data-test="repair-result"]').exists()).toBe(true)
    expect(returned.text()).toContain('官网处理结果')
    expect(returned.text()).toContain('官网已返回处理结果')
    expect(returned.text()).toContain(`${task.evidence}；官网已返回处理结果。`)
    task.workflow!.site.result = '服务端回传：已完成实体档案修复。'
    const withServerResult = mountWorkspace('ops', task)
    expect(withServerResult.text()).toContain('服务端回传：已完成实体档案修复。')

    task.progress = 'site_failed'
    const failed = mountWorkspace('ops', task)
    expect(failed.get('.tw-title-line .ce-tag').attributes('data-tone')).toBe('red')
    expect(failed.get('[data-test="repair-result"] .tw-repair-result-card__heading').text()).toContain('官网已返回处理结果')
  })

  it('renders generated content as read-only during the review step', async () => {
    const task = makeTask()
    task.progress = 'human'
    const flow = ensureWorkflow(task)
    flow.brief.webSupplement = true
    flow.output.body = `<h2>${task.name}</h2><p>${'航空采购 FAQ 的交付稳定性说明。'.repeat(12)}</p>`
    const wrapper = mountWorkspace('ops', task)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.find('.ProseMirror').exists()).toBe(true)
    expect(wrapper.get('.ProseMirror').attributes('contenteditable')).toBe('false')
    expect(wrapper.find('.task-rich-editor__toolbar').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="加粗"]').exists()).toBe(false)
    expect(wrapper.get('.tw-actionbar').text()).toContain('请查看生成内容；内容只读，只能选择通过或拒绝。通过后交客户确认，拒绝则退回重新生成。')
    expect(wrapper.get('[data-test="approve-output"]').text()).toBe('通过，交客户确认')
    expect(wrapper.find('.tw-actionbar strong').exists()).toBe(false)
    expect(wrapper.find('.tw-actionbar [data-test="ignore-task"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="reject-output"]').text()).toBe('拒绝')
    expect(wrapper.find('[data-test="save-inline-output"]').exists()).toBe(false)
    expect(wrapper.findAll('.tw-actionbar button').map(button => button.text())).toEqual([
      '拒绝',
      '通过，交客户确认',
    ])
    expect(wrapper.find('[data-test="save-output"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="copy-output"]').exists()).toBe(false)
    expect(wrapper.get('.tw-workspace-head').text()).toContain('内容审核工作区')
    expect(wrapper.find('.tw-stage-permission').exists()).toBe(false)
    expect(wrapper.get('[data-test="review-insights"]').text()).toContain('段落问题')
    expect(wrapper.get('[data-test="review-insights"]').text()).toContain('1 个长段落建议人工确认')
    expect(wrapper.get('[data-test="review-insights"]').text()).toContain('3/4 通过')
    expect(wrapper.find('[data-test="open-ai-optimize"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="regenerate-article"]').exists()).toBe(false)
    expect(wrapper.find('.tw-output-status').exists()).toBe(false)
    expect(wrapper.find('[data-test="external-claim-summary"]').exists()).toBe(false)
    expect(wrapper.get('.task-rich-editor__page').classes()).toContain('is-full-width')
    expect(wrapper.find('.tw-confirmation').exists()).toBe(false)
    expect(wrapper.find('[data-test="drawer"]').exists()).toBe(false)
  })

  it('renders code content as a code block without the preview confirmation step', async () => {
    const task = makeTask()
    task.source = 'F9'
    task.progress = 'client_review'
    ensureWorkflow(task)
    const wrapper = mountWorkspace('client', task)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.findAll('.tw-flow-steps li')).toHaveLength(6)
    expect(wrapper.get('.tw-flow-steps').text()).not.toContain('预览链接与发布确认')
    expect(wrapper.get('.ProseMirror').attributes('contenteditable')).toBe('false')
    expect(wrapper.get('.ProseMirror pre').text()).toContain('<meta name="description"')
    expect(wrapper.get('.ProseMirror pre').text()).toContain('"@type": "Organization"')
    expect(wrapper.find('[data-test="review-insights"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="approve-output"]').text()).toBe('通过')
  })

  it('auto-completes code content after website verification', () => {
    const task = makeTask()
    task.source = 'F9'
    task.progress = 'client_review'
    ensureWorkflow(task)

    expect(task.workflow?.output.body).toContain('<pre><code>')
    expect(applyAction(task, 'client', 'agent', 'approve_client')).toBeNull()
    expect(task.progress).toBe('site_submitted')
    expect(advanceAutomatic(task, 'agent')).toBe(true)
    expect(advanceAutomatic(task, 'agent')).toBe(true)
    expect(advanceAutomatic(task, 'agent')).toBe(true)
    expect(task.progress).toBe('done')
  })

  it('keeps operations from editing generated content during review', async () => {
    const task = makeTask()
    task.progress = 'human'
    const originalBody = ensureWorkflow(task).output.body
    const wrapper = mountWorkspace('ops', task)
    await new Promise(resolve => setTimeout(resolve, 0))
    const proseMirror = wrapper.get('.ProseMirror')
    proseMirror.element.textContent = '运营保存后的正文'
    await proseMirror.trigger('input')

    expect(wrapper.find('[data-test="save-inline-output"]').exists()).toBe(false)
    expect(wrapper.get('.ProseMirror').attributes('contenteditable')).toBe('false')

    await wrapper.get('[data-test="approve-output"]').trigger('click')

    expect(task.workflow?.output.body).toBe(originalBody)
    expect(task.workflow?.output.revision).toBe(1)
    expect(task.progress).toBe('client_review')
  })

  it('does not warn before leaving a read-only content review', async () => {
    const task = makeTask()
    task.progress = 'human'
    const wrapper = mountWorkspace('ops', task)
    await new Promise(resolve => setTimeout(resolve, 0))
    const editor = wrapper.get('.ProseMirror')
    editor.element.textContent = '只读内容不应触发未保存提示'
    await editor.trigger('input')

    await wrapper.get('.tw-back-button').trigger('click')
    expect(task.progress).toBe('human')
    expect(document.body.textContent).not.toContain('请确认已保存修改内容')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('gives the customer only reject and approve while reviewing generated content', async () => {
    const task = makeTask()
    task.progress = 'client_review'
    ensureWorkflow(task)
    const wrapper = mountWorkspace('client', task, vi.fn(), false, 'agent')
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.get('.ProseMirror').attributes('contenteditable')).toBe('false')
    expect(wrapper.find('[data-test="save-inline-output"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="reject-output"]').text()).toBe('拒绝')
    expect(wrapper.get('[data-test="approve-output"]').text()).toBe('通过')
    expect(task.progress).toBe('client_review')
  })

  it('opens the final content preview without an operations submit confirmation', async () => {
    const task = makeTask()
    task.progress = 'site_submit'
    ensureWorkflow(task)
    const wrapper = mountWorkspace('ops', task)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.get('.tw-more-details > .tw-tabs').classes()).toContain('tw-tabs--workspace')
    expect(wrapper.get('.tw-tabs button[aria-current="page"]').text()).toBe('最终稿')
    expect(wrapper.find('.ProseMirror').exists()).toBe(true)
    expect(wrapper.get('.ProseMirror').attributes('contenteditable')).toBe('false')
    expect(wrapper.find('.task-rich-editor__toolbar').exists()).toBe(false)
    expect(wrapper.get('[data-test="submit-site"]').text()).toBe('提交 AI 建站')
    expect(wrapper.find('.tw-confirmation').exists()).toBe(false)
  })

  it('keeps the preview link in one status strip above the article', () => {
    const task = makeTask()
    task.progress = 'site_publish'
    const flow = ensureWorkflow(task)
    flow.site.preview = 'Preview V1'
    const wrapper = mountWorkspace('client', task)

    const strip = wrapper.get('.tw-site-strip')
    expect(strip.text()).toContain('GEO 验证通过 · 待发布')
    expect(strip.text()).toContain('发布内容预览已就绪 · Preview V1')
    expect(strip.get('.tw-preview-link').attributes('href')).toContain('/optimization/tasks/T-2402/preview')
    expect((strip.element.nextElementSibling as HTMLElement).className).toContain('tw-output-review-layout')
    expect(wrapper.find('.tw-site-feedback').exists()).toBe(false)
    expect(wrapper.find('.tw-output-review-below').exists()).toBe(false)
  })

  it('returns a failed website verification to content review instead of publishing', async () => {
    const task = makeTask()
    task.progress = 'site_failed'
    const flow = ensureWorkflow(task)
    flow.output.body = '<p>待修改正文</p>'
    flow.site.result = '验证未通过：正文参数与已确认事实不一致。'
    flow.site.simulateFailure = true
    const wrapper = mountWorkspace('client', task, vi.fn(), false, 'agent')

    expect(wrapper.get('[data-test="return-content-review"]').text()).toBe('返回内容审核改写')
    expect(wrapper.find('[data-test="confirm-publish"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ignore-task"]').exists()).toBe(true)
    expect(wrapper.get('.tw-site-strip').text()).toContain('验证未通过')

    await wrapper.get('[data-test="return-content-review"]').trigger('click')
    expect(task.progress).toBe('client_review')
    expect(task.workflow?.site.simulateFailure).toBe(false)
  })

  it('shows the waiting state for operations and publish actions for the customer in step four', async () => {
    const task = makeTask()
    task.progress = 'site_publish'
    ensureWorkflow(task)

    const operationsView = mountWorkspace('ops', task)
    expect(operationsView.get('.tw-actionbar').text()).toContain('现在需要客户')
    expect(operationsView.get('.tw-actionbar').text()).toContain('等待客户发布确认')
    expect((operationsView.get('[data-test="publish-waiting"]').element as HTMLButtonElement).disabled).toBe(true)

    const customerView = mountWorkspace('client', task)
    expect(customerView.get('.tw-actionbar').text()).toContain('确认后发布上线')
    expect(customerView.find('.tw-actionbar input[type="url"]').exists()).toBe(false)
    await customerView.get('[data-test="confirm-publish"]').trigger('click')
    expect(task.progress).toBe('done')
  })

  it('shows the reference waiting bar for operations while preserving customer final-review actions', () => {
    const task = makeTask()
    task.progress = 'client_review'
    ensureWorkflow(task)

    const operationsView = mountWorkspace('ops', task)
    expect(operationsView.get('.tw-actionbar').text()).toContain('专家已审核通过，当前等待客户查看最新保存版本并确认最终稿。')
    expect(operationsView.find('.tw-actionbar strong').exists()).toBe(false)
    expect(operationsView.find('[data-test="ignore-task"]').exists()).toBe(false)
    expect(operationsView.get('[data-test="waiting-client-final-review"]').text()).toBe('等待客户确认最终稿')
    expect((operationsView.get('[data-test="waiting-client-final-review"]').element as HTMLButtonElement).disabled).toBe(true)
    expect(operationsView.find('.tw-actionbar .tw-success').exists()).toBe(false)

    const customerView = mountWorkspace('client', task)
    expect(customerView.get('.tw-actionbar').text()).toContain('请查看生成内容；内容只读，只能选择通过或拒绝。')
    expect(customerView.find('[data-test="waiting-client-final-review"]').exists()).toBe(false)
  })

  it('shows the monitoring step and moves to the completed state only when explicitly confirmed', async () => {
    const task = makeTask()
    task.progress = 'recheck'
    ensureWorkflow(task)
    const wrapper = mountWorkspace('ops', task)

    expect(wrapper.get('.tw-actionbar').text()).toContain('现在需要监测 Agent')
    expect(wrapper.get('.tw-actionbar').text()).toContain('等待新的监测轮次进行官网核验')
    await wrapper.get('[data-test="complete-recheck"]').trigger('click')

    expect(task.progress).toBe('done')
    expect(wrapper.get('.tw-actionbar').text()).toContain('本任务已完成')
    expect(wrapper.get('.tw-actionbar').text()).toContain('任务已形成闭环，可从来源策略查看效果回流。')
    expect(wrapper.find('.tw-actionbar .tw-success').exists()).toBe(false)
    expect(wrapper.get('[data-test="return-optimization"]').text()).toBe('返回优化中心')
    expect(wrapper.get('[data-test="return-optimization"]').attributes('data-variant')).toBe('primary')
    expect(wrapper.find('.tw-confirmation').exists()).toBe(false)
    await wrapper.get('[data-test="return-optimization"]').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('shows the web supplement setting regardless of its current value', async () => {
    const task = makeTask()
    task.progress = 'human'
    ensureWorkflow(task).brief.webSupplement = false
    const wrapper = mountWorkspace('ops', task)
    await wrapper.findAll('.tw-tabs button').find(button => button.text() === 'Brief')!.trigger('click')

    expect(wrapper.find('.tw-web-supplement').exists()).toBe(true)
  })

  it('allows the current customer reviewer to change the first-step web supplement choice from the Brief tab', async () => {
    const task = makeTask()
    task.progress = 'client_review'
    ensureWorkflow(task).brief.webSupplement = true
    const wrapper = mountWorkspace('client', task)
    await wrapper.findAll('.tw-tabs button').find(button => button.text() === 'Brief')!.trigger('click')

    const toggle = wrapper.get('.tw-content-basis input[type="checkbox"]')
    expect((toggle.element as HTMLInputElement).disabled).toBe(false)
    await toggle.setValue(false)

    expect(task.progress).toBe('client_review')
    expect(task.workflow?.brief.webSupplement).toBe(false)
    expect(task.workflow?.reviews.at(-1)?.note).toContain('联网补充已关闭')
    expect(task.workflow?.versions.at(-1)?.note).toContain('调整联网补充设置')
    expect((wrapper.get('.tw-content-basis input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false)
  })

  it('hides the operations-waiting action bar from customers while keeping the workflow steps', () => {
    const task = makeTask()
    task.progress = 'human'
    ensureWorkflow(task)

    const customerView = mountWorkspace('client', task)
    expect(customerView.find('.tw-actionbar').exists()).toBe(false)
    expect(customerView.findAll('.tw-flow-steps li')).toHaveLength(7)

    const operationsView = mountWorkspace('ops', task)
    expect(operationsView.get('[data-test="approve-output"]').text()).toBe('通过，交客户确认')
  })

  it('removes the current-permission strip from both customer and operations views', () => {
    const task = makeTask()
    task.progress = 'client_review'
    const customerView = mountWorkspace('client', task)

    expect(customerView.find('.tw-stage-permission').exists()).toBe(false)
    expect(customerView.get('.tw-actionbar').text()).toContain('请查看生成内容；内容只读，只能选择通过或拒绝。拒绝后按修改次数规则退回处理（最多 3 次，已使用 0 次）。')
    expect(customerView.find('.tw-actionbar strong').exists()).toBe(false)
    expect(customerView.find('[data-test="defer-task"]').exists()).toBe(false)
    expect(customerView.find('[data-test="ignore-task"]').exists()).toBe(false)
    expect(customerView.find('[data-test="reject-output"]').exists()).toBe(true)
    expect(customerView.find('[data-test="request-output-feedback"]').exists()).toBe(false)
    expect(customerView.get('[data-test="approve-output"]').text()).toBe('通过')
    expect(customerView.get('.tw-actionbar button:last-child').attributes('data-variant')).toBe('primary')
    expect(customerView.find('.tw-confirmation').exists()).toBe(false)

    const operationsView = mountWorkspace('ops', task)
    expect(operationsView.find('.tw-stage-permission').exists()).toBe(false)
  })

  it('moves customer final approval to the website execution step', async () => {
    const task = reactive(makeTask())
    task.progress = 'client_review'
    ensureWorkflow(task)
    const wrapper = mountWorkspace('client', task)

    await wrapper.get('[data-test="approve-output"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(task.progress).toBe('site_submit')
    expect(wrapper.find('[data-test="waiting-client-final-review"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="submit-site"]').exists()).toBe(false)
    expect(wrapper.get('.tw-actionbar').text()).toContain('等待专家提交 AI 建站')
    expect(wrapper.findAll('.tw-flow-steps li').findIndex(step => step.classes().includes('current'))).toBe(4)

    const operationsView = mountWorkspace('ops', task)
    expect(operationsView.get('[data-test="submit-site"]').text()).toBe('提交 AI 建站')
  })

  it('shows screenshot-matched review copy and customer actions without an edit button', async () => {
    const task = makeTask()
    task.type = 'external'
    task.progress = 'client_content_review'
    ensureWorkflow(task).output.body = '客户可审阅的示例文案'
    const wrapper = mountWorkspace('client', task)

    expect(wrapper.get('.task-rich-editor__ai-dock').attributes('aria-label')).toBe('AI 写作及质检')
    expect(wrapper.find('[data-test="customer-edit-output"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="copy-output"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="save-output"]').exists()).toBe(false)
    expect(wrapper.get('.tw-actionbar').text()).toContain('请确认文案结果；需要修改时直接点击正文编辑，保存后再确认。')
    expect(wrapper.get('.tw-actionbar').text()).toContain('忽略')
    expect(wrapper.get('.tw-actionbar').text()).toContain('保存正文')
    expect(wrapper.get('[data-test="approve-output"]').text()).toBe('客户确认最终稿')
    expect(wrapper.find('[data-test="edit-output-inline"]').exists()).toBe(false)
    expect(wrapper.findAll('.tw-flow-steps li')[1]?.classes()).toContain('current')

    await wrapper.get('[data-test="approve-output"]').trigger('click')
    expect(task.progress).toBe('human')
    expect(wrapper.findAll('.tw-flow-steps li')[2]?.classes()).toContain('current')
  })

  it('does not persist edits when the reviewer approves read-only content', async () => {
    const task = makeTask()
    task.progress = 'human'
    const originalBody = ensureWorkflow(task).output.body
    const wrapper = mountWorkspace('ops', task)
    await new Promise(resolve => setTimeout(resolve, 0))
    const proseMirror = wrapper.get('.ProseMirror')
    proseMirror.element.textContent = '修改后的成稿'
    await proseMirror.trigger('input')
    await wrapper.get('[data-test="approve-output"]').trigger('click')

    expect(task.workflow?.output.body).toBe(originalBody)
    expect(task.workflow?.output.body).not.toContain('修改后的成稿')
    expect(task.workflow?.output.revision).toBe(1)
    expect(task.progress).toBe('client_review')
    expect(wrapper.find('[data-test="drawer"]').exists()).toBe(false)
  })

  it('omits secondary permission and flow links while keeping the progress steps', () => {
    const task = makeTask()
    task.type = 'repair'
    task.destination = '技术修复'
    task.progress = 'site_running'
    const wrapper = mountWorkspace('ops', task)

    expect(wrapper.find('.tw-permission-help').exists()).toBe(false)
    expect(wrapper.find('[data-test="workflow-role-switch"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('官网技术修复流程')
    expect(wrapper.text()).not.toContain('查看完整流程与角色分工')
    expect(wrapper.find('.tw-flow-steps').exists()).toBe(true)
    expect(wrapper.find('.tw-flow-steps').element.getAttribute('style')).toContain('--tw-step-count: 2')
  })

  it('keeps the customer read-only and gives operations the Brief action controls', () => {
    const customerView = mountWorkspace('client')
    expect(customerView.find('.tw-brief-permission').exists()).toBe(false)
    expect(customerView.get('.tw-brief-confirm').text()).toContain('不提供编辑操作')
    expect(customerView.find('.tw-actionbar').exists()).toBe(false)
    expect(customerView.findAll('button').some(candidate => candidate.text().includes('专家审核通过并生成内容'))).toBe(false)
    expect(customerView.findAll('button').some(candidate => candidate.text().trim() === '忽略')).toBe(false)

    const operationsView = mountWorkspace('ops')
    expect(operationsView.get('.tw-brief-confirm .tw-actions').text()).toContain('专家审核通过并生成内容')
    expect(operationsView.get('.tw-brief-confirm .tw-actions').text()).toContain('忽略')
  })

  it('shows a top toast instead of opening knowledge preparation when both content sources are empty', async () => {
    const task = makeTask()
    ensureWorkflow(task).brief.webSupplement = false
    const wrapper = mountWorkspace('ops', task)

    const button = wrapper.findAll('.tw-brief-confirm button').find(candidate => candidate.text().includes('专家审核通过并生成内容'))!
    await button.trigger('click')

    expect(wrapper.find('[data-test="drawer"]').exists()).toBe(false)
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('请选择知识资料、填写补充说明或勾选联网补充')
    expect(wrapper.get('.tw-gate').text()).toContain('选择知识资料、填写补充说明或勾选联网补充')
    wrapper.unmount()
  })

  it('confirms the task when web supplementation is selected without other content sources', async () => {
    const task = makeTask()
    const wrapper = mountWorkspace('ops', task)
    expect((wrapper.get('.tw-web-supplement input').element as HTMLInputElement).checked).toBe(true)

    const button = wrapper.findAll('.tw-brief-confirm button').find(candidate => candidate.text().includes('专家审核通过并生成内容'))!
    await button.trigger('click')

    expect(task.progress).toBe('todo')
    expect(task.workflow?.brief.webSupplement).toBe(true)
    wrapper.unmount()
  })

  it('confirms the task when operations provides a direct AI instruction without knowledge materials', async () => {
    const task = makeTask()
    ensureWorkflow(task).brief.webSupplement = false
    const wrapper = mountWorkspace('ops', task)
    await wrapper.get('.tw-content-basis textarea').setValue('重点介绍本地服务，不补充未经确认的承诺。')

    expect(wrapper.get('.tw-gate strong').text()).toBe('内容依据已准备完成')
    const button = wrapper.findAll('.tw-brief-confirm button').find(candidate => candidate.text().includes('专家审核通过并生成内容'))!
    await wrapper.get('[data-test="save-brief-draft"]').trigger('click')
    await button.trigger('click')

    expect(task.progress).toBe('todo')
    expect(task.workflow?.brief.contentInstruction).toBe('重点介绍本地服务，不补充未经确认的承诺。')
    wrapper.unmount()
  })

  it('confirms the task when operations has completed all required preparation', async () => {
    const task = makeTask()
    ensureWorkflow(task).knowledge.push({ ...knowledgeLibrary[0]! })
    const wrapper = mountWorkspace('ops', task)

    const button = wrapper.findAll('.tw-brief-confirm button').find(candidate => candidate.text().includes('专家审核通过并生成内容'))!
    expect((button.element as HTMLButtonElement).disabled).toBe(false)
    await button.trigger('click')

    expect(task.progress).toBe('todo')
    expect(task.workflow?.briefStatus).toBe('confirmed')
  })
})

it.each(['web', 'external'] as const)('lets the customer confirm a %s Brief and review generated content in customer-only mode', async (type) => {
  vi.useFakeTimers()
  const task = reactive(makeTask())
  task.type = type
  ensureWorkflow(task).brief.webSupplement = true
  const wrapper = mountWorkspace('client', task)
  await wrapper.setProps({ serviceMode: 'agent' })
  expect(wrapper.find('[data-test="workflow-role-switch"]').exists()).toBe(false)
  expect(wrapper.find('[data-test="adjust-materials"]').exists()).toBe(true)
  expect(wrapper.get('.tw-brief-confirm').text()).toContain('确认并生成内容')
  await wrapper.get('.tw-brief-confirm button[data-variant="primary"]').trigger('click')
  expect(task.progress).toBe('todo')
  await vi.advanceTimersByTimeAsync(3400)
  expect(task.progress).toBe('client_review')
  expect(wrapper.find('[data-test="review-insights"]').exists()).toBe(true)
  expect(wrapper.find('.task-rich-editor__ai-dock').exists()).toBe(true)
  expect(wrapper.get('.ProseMirror').attributes('contenteditable')).toBe(type === 'web' ? 'false' : 'true')
  expect(wrapper.find('[data-test="save-inline-output"]').exists()).toBe(type === 'external')
  expect(wrapper.find('[data-test="open-ai-optimize"]').exists()).toBe(type === 'external')
  expect(wrapper.get('.tw-actionbar').text()).not.toContain('提交修改意见')
  expect(wrapper.find('[data-test="request-output-feedback"]').exists()).toBe(false)
  await wrapper.get('[data-test="approve-output"]').trigger('click')
  if (type === 'web') {
    await vi.advanceTimersByTimeAsync(5000)
    expect(task.progress).toBe('site_publish')
    await wrapper.get('[data-test="confirm-publish"]').trigger('click')
  }
  expect(task.progress).toBe('done')
  wrapper.unmount()
})

it('omits the revision-request action from every customer-only content review stage', async () => {
  for (const progress of ['client_content_review', 'human', 'client_review'] as const) {
    const task = makeTask()
    task.progress = progress
    ensureWorkflow(task).output.body = '待审核文案'
    const wrapper = mountWorkspace('client', task)
    await wrapper.setProps({ serviceMode: 'agent' })
    expect(wrapper.get('.tw-actionbar').text()).not.toContain('提交修改意见')
    expect(wrapper.find('[data-test="request-output-feedback"]').exists()).toBe(false)
    wrapper.unmount()
  }
})

