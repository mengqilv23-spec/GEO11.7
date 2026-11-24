import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, inject } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { GeoWorkbenchRouteContext } from '../composables/workbench-route-context'
import { geoWorkbenchRouteContextKey } from '../composables/workbench-route-context'
import { codeReviewDemoTasksFor, codeReviewTestFindings } from '../data/code-review-demo-tasks'
import { auditFindings, strategies } from '../data/geo-data'
import { useWorkbenchTasksStore } from '../stores/workbench-tasks'
import GeoWorkbenchLayout from './GeoWorkbenchLayout.vue'
import PrioritySelect from '../components/workbench/shared/PrioritySelect.vue'

function makeRouteProbe() {
  return defineComponent({
    setup() {
      const context = inject(geoWorkbenchRouteContextKey)!
      return () => h('div', [
        h('button', { 'data-test': 'open-pending', 'onClick': context.openPending }, '打开待处理'),
        h('button', { 'data-test': 'open-audit', 'onClick': () => context.openAudit(auditFindings.find(finding => finding.id === 'F9')!) }, '打开诊断'),
        h('button', {
          'data-test': 'select-bulk-findings',
          'onClick': () => {
            context.toggleFinding('F8-1')
            context.toggleFinding('F8-3')
          },
        }, '选择两条异常'),
        h('button', { 'data-test': 'approve-bulk-findings', 'onClick': context.approveSelectedFindings }, '批量审核'),
        h('button', { 'data-test': 'open-strategy-finding', 'onClick': () => context.openAudit(auditFindings.find(finding => finding.id === 'F8-2')!) }, '打开策略型诊断'),
        h('button', { 'data-test': 'open-strategy', 'onClick': () => context.openStrategy(strategies.find(strategy => strategy.id === 'GS11')!) }, '打开候选策略'),
      ])
    },
  })
}

describe('geoWorkbenchLayout icon migration', () => {
  it('uses an arrow icon for pending actions and preserves flow arrows in copy', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'overview', component: makeRouteProbe() }],
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(GeoWorkbenchLayout, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          GeoWorkbenchToolbar: true,
          GeoSectionNav: true,
          RouterLink: { template: '<a><slot /></a>' },
          GeoDrawer: { props: ['open', 'title', 'subtitle', 'eyebrow', 'size', 'titleFirst'], template: '<div v-if="open" class="test-drawer" :data-size="size"><header><template v-if="titleFirst"><h2>{{ title }}</h2><small>{{ eyebrow }}</small></template><template v-else><small>{{ eyebrow }}</small><h2>{{ title }}</h2></template><p>{{ subtitle }}</p></header><slot /><footer><slot name="footer" /></footer></div>' },
        },
      },
    })

    expect(wrapper.find('geo-workbench-toolbar-stub').exists()).toBe(true)

    await wrapper.get('[data-test="open-pending"]').trigger('click')
    expect(wrapper.get('.geo-pending-item b').text()).toContain('立即处理')
    expect(wrapper.find('.geo-pending-item b svg.lucide-arrow-right').exists()).toBe(true)

    await wrapper.get('[data-test="open-audit"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('.test-drawer').text()).not.toContain('后续流程')
    expect(wrapper.get('.test-drawer').attributes('data-size')).toBe('600')
    const taskStore = useWorkbenchTasksStore()
    const initialTaskCount = taskStore.tasks.length
    const repairApproval = wrapper.findAll('.test-drawer footer button').find(button => button.text() === '确认处理并生成任务')
    expect(repairApproval).toBeDefined()
    expect(taskStore.tasks.length).toBe(initialTaskCount)

    const countBeforeBulkApproval = taskStore.tasks.length
    await wrapper.get('[data-test="select-bulk-findings"]').trigger('click')
    await wrapper.get('[data-test="approve-bulk-findings"]').trigger('click')
    expect(taskStore.tasks.length).toBe(countBeforeBulkApproval)
    expect(wrapper.find('.geo-toast').text()).toContain('请选择至少一条可审核的问题')

    await wrapper.get('[data-test="open-strategy-finding"]').trigger('click')
    const findingDrawer = wrapper.get('.test-drawer')
    expect(findingDrawer.get('small').text()).toBe('')
    expect(findingDrawer.get('header').element.firstElementChild?.tagName).toBe('H2')
    expect(findingDrawer.get('h2').text()).toBe('补充知识提醒 · 专家作者档案待补')
    expect(findingDrawer.text()).toContain('⑤ 品牌实体')
    expect(findingDrawer.text()).toContain('官网内容 · 待补充知识库')
    expect(findingDrawer.get('.geo-finding-status').text()).toBe('已完成')
    expect(findingDrawer.text()).toContain('当前作者页仅显示两位工程师的姓名与内容贡献')
    expect(findingDrawer.text()).toContain('请补充已核实的工程师身份、专业背景及作者介绍资料；补充后下一次监测重新核对。')
    expect(findingDrawer.text()).not.toContain('后续流程')
    expect(wrapper.findAll('.test-drawer footer button').some(button => button.text() === '忽略')).toBe(false)
    const strategyApproval = wrapper.findAll('.test-drawer footer button').find(button => button.text() === '确认处理并生成任务')
    expect(strategyApproval).toBeUndefined()
    expect(wrapper.findAll('.test-drawer footer button').some(button => button.text() === '进入任务')).toBe(false)
    wrapper.unmount()
  })

  it('shows candidate strategy details in the two-card review drawer layout', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'overview', component: makeRouteProbe() }],
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(GeoWorkbenchLayout, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          GeoWorkbenchToolbar: true,
          GeoSectionNav: true,
          RouterLink: { template: '<a><slot /></a>' },
          GeoDrawer: { props: ['open', 'title', 'subtitle', 'eyebrow', 'size', 'titleFirst'], template: '<div v-if="open" class="test-drawer" :data-size="size"><header><template v-if="titleFirst"><h2>{{ title }}</h2><small>{{ eyebrow }}</small></template><template v-else><small>{{ eyebrow }}</small><h2>{{ title }}</h2></template><p>{{ subtitle }}</p></header><slot /><footer><slot name="footer" /></footer></div>' },
        },
      },
    })

    await wrapper.get('[data-test="open-strategy"]').trigger('click')

    const drawer = wrapper.get('.test-drawer')
    expect(drawer.get('header').element.firstElementChild?.tagName).toBe('H2')
    expect(drawer.attributes('data-size')).toBe('560')
    expect(drawer.get('small').text()).toBe('Gap 10')
    expect(drawer.get('p').text()).toBe('')
    expect(drawer.get('h2').text()).toBe('交期页增加汽车工艺停机风险与服务问答')
    expect(drawer.findAll('.geo-strategy-detail-card__header').map(header => header.text())).toEqual([
      '认知缺口策略待审核',
      'Agent 建议方法',
      '策略依据',
    ])
    expect(drawer.get('.geo-strategy-evidence__platforms').text()).toContain('全部平台汇总')
    expect(drawer.get('.geo-strategy-evidence__platforms').text()).toContain('ChatGPT')
    expect(drawer.find('.geo-strategy-status').exists()).toBe(false)
    expect(drawer.find('.geo-strategy-drawer__status').text()).toBe('待审核')
    expect(drawer.get('.geo-strategy-detail-grid').text()).toContain('策略类型官网内容')
    expect(drawer.get('.geo-strategy-detail-grid').text()).toContain('目标人设汽车工艺、车间主管')
    expect(drawer.get('.geo-strategy-detail-grid').text()).toContain('买家关注点停机风险')
    expect(drawer.get('.geo-strategy-recommendation').text()).toBe('建议采用停机风险 Q&A、服务问答、买家场景补充等方式，完成本次官网内容优化。')
    expect(drawer.text()).not.toContain('审核与协作记录')
    expect(wrapper.findAll('.test-drawer footer button').some(button => button.text() === '忽略')).toBe(false)
    wrapper.unmount()
  })
})

it('keeps customer changes scoped to the review modules without product or role switches', async () => {
  localStorage.clear()
  let workbench!: GeoWorkbenchRouteContext
  const probe = defineComponent({
    setup() {
      const context = inject(geoWorkbenchRouteContextKey)!
      workbench = context
      return () => h('div', [
        h('span', { 'data-test': 'selected' }, String(context.findings.find(item => item.id === 'F8-2')?.checked)),
        h('button', { 'data-test': 'choose-finding', onClick: () => context.toggleFinding('F8-2') }, '选择诊断'),
        h('button', { 'data-test': 'adopt-strategy', onClick: () => context.confirmStrategy(context.strategies.find(item => item.id === 'GS4')!) }, '采纳策略'),
      ])
    },
  })
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/diagnosis', name: 'diagnosis', component: probe },
    { path: '/overview', name: 'overview', component: probe },
  ] })
  await router.push('/diagnosis')
  await router.isReady()
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true,
    GeoDrawer: true, RouterLink: true,
  } } })
  expect(wrapper.find('.geo-workbench-sidebar__product').exists()).toBe(false)
  expect(wrapper.find('.geo-role-switch').exists()).toBe(false)
  await wrapper.get('[data-test="choose-finding"]').trigger('click')
  expect(wrapper.get('[data-test="selected"]').text()).toBe('false')
  // Keep this fixture on the ordinary content-strategy path; verify strategies
  // now record their conclusion in the diagnosis drawer instead of a task.
  workbench.strategies.find(item => item.id === 'GS4')!.gapFacts = { verified: true, capability: true, contentExists: true, clear: false, readable: true, thirdParty: false }
  await wrapper.get('[data-test="adopt-strategy"]').trigger('click')
  await flushPromises()
  const customerState = JSON.parse(localStorage.getItem('geo-workbench:agent')!)
  expect(customerState.strategies.find((item: { id: string }) => item.id === 'GS4').confirmed).toBe(true)
  expect(customerState.reviews.GS4.at(-1).name).toBe('客户')
  await router.push('/overview')
  await flushPromises()
  expect(wrapper.get('[data-test="selected"]').text()).toBe('false')
  await router.push('/diagnosis')
  await flushPromises()
  expect(wrapper.get('[data-test="selected"]').text()).toBe('false')
  wrapper.unmount()
  localStorage.clear()
})


it('lets the agent customer ignore a strategy without a reason or explanation', async () => {
  localStorage.clear()
  const probe = defineComponent({
    setup() {
      const context = inject(geoWorkbenchRouteContextKey)!
      return () => h('button', { 'data-test': 'open-strategy', 'onClick': () => context.openStrategy(context.strategies.find(item => item.id === 'GS11')!) }, '打开候选策略')
    },
  })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: probe }] })
  await router.push('/diagnosis')
  await router.isReady()
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true,
    GeoSectionNav: true,
    RouterLink: true,
    GeoDrawer: { props: ['open', 'title', 'subtitle', 'eyebrow', 'size', 'titleFirst'], template: '<div v-if="open" class="test-drawer"><header><h2>{{ title }}</h2></header><slot /><footer><slot name="footer" /></footer></div>' },
  } } })

  await wrapper.get('[data-test="open-strategy"]').trigger('click')
  await flushPromises()
  const ignoreButton = wrapper.findAll('.test-drawer footer button').find(button => button.text() === '不处理')
  expect(ignoreButton).toBeTruthy()
  await ignoreButton!.trigger('click')
  await flushPromises()

  const confirmButton = wrapper.findAll('.test-drawer footer button').find(button => button.text() === '确认不处理')
  expect(confirmButton).toBeTruthy()
  await confirmButton!.trigger('click')
  await flushPromises()

  const state = JSON.parse(localStorage.getItem('geo-workbench:agent')!)
  const strategy = state.strategies.find((item: { id: string }) => item.id === 'GS11')
  expect(strategy.ignored).toBe(true)
  expect(strategy.reviewNote).toBeUndefined()
  wrapper.unmount()
  localStorage.clear()
})

it('runs direct technical repairs without customer approval', async () => {
  localStorage.clear()
  vi.useFakeTimers()
  const probe = defineComponent({
    setup() {
      const context = inject(geoWorkbenchRouteContextKey)!
      return () => h('div', context.findings.filter(f => f.route === 'repair' && f.id !== 'F9').map(f =>
        h('button', { 'data-test': f.id, onClick: () => context.openAudit(f) }, f.status)))
    },
  })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: probe }] })
  await router.push('/diagnosis')
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true, RouterLink: true,
    GeoDrawer: { props: ['open'], template: '<div v-if="open" class="test-drawer"><slot /><footer><slot name="footer" /></footer></div>' },
  } } })
  try {
    await wrapper.get('[data-test="F7-1"]').trigger('click')
    expect(wrapper.get('.test-drawer').text()).toContain('AI建站处理中')
    expect(wrapper.get('.test-drawer footer').text()).not.toContain('审核通过')
    expect(wrapper.get('.test-drawer footer').text()).not.toContain('暂不修复')
    await vi.advanceTimersByTimeAsync(10000)
    expect(wrapper.get('.test-drawer').text()).toContain('已完成处理')
    for (const id of ['F7-1', 'F7-2', 'F8-1'])
      expect(wrapper.get(`[data-test="${id}"]`).text()).toBe('已修复')
    await wrapper.get('[data-test="F8-3"]').trigger('click')
    expect(wrapper.get('.test-drawer').text()).toContain('已完成处理')
    const repairs = useWorkbenchTasksStore().tasks.filter(t => t.type === 'repair' && t.source.includes('F7-'))
    expect(repairs).toHaveLength(1)
    expect(repairs[0]?.progress).toBe('done')
  }
  finally { wrapper.unmount(); vi.useRealTimers() }
})

it('labels a direct technical repair detail as a solution', async () => {
  localStorage.clear()
  const probe = defineComponent({
    setup() {
      const context = inject(geoWorkbenchRouteContextKey)!
      return () => h('div', context.findings.filter(finding => finding.id === 'F7-1').map(finding =>
        h('button', { 'data-test': finding.id, onClick: () => context.openAudit(finding) }, finding.status)))
    },
  })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: probe }] })
  await router.push('/diagnosis')
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true, RouterLink: true,
    GeoDrawer: { props: ['open'], template: '<div v-if="open" class="test-drawer"><slot /><footer><slot name="footer" /></footer></div>' },
  } } })
  try {
    await wrapper.get('[data-test="F7-1"]').trigger('click')
    expect(wrapper.get('.test-drawer').text()).toContain('解决方案')
    expect(wrapper.get('.test-drawer').text()).not.toContain('处理范围')
  }
  finally {
    wrapper.unmount()
    localStorage.clear()
  }
})

it('persists customer priority changes including P3', async () => {
  localStorage.clear()
  const probe = defineComponent({ setup() {
    const context = inject(geoWorkbenchRouteContextKey)!
    return () => h('button', { 'data-test': 'review-priority', onClick: () => context.openStrategy(context.strategies.find(item => item.id === 'GS4')!) }, '审核')
  } })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: probe }] })
  await router.push('/diagnosis')
  const mountLayout = () => mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true, RouterLink: true,
    GeoDrawer: { props: ['open'], template: '<div v-if="open"><slot /><slot name="footer" /></div>' },
  } } })
  let wrapper = mountLayout()
  try {
    await wrapper.get('[data-test="review-priority"]').trigger('click')
    wrapper.getComponent(PrioritySelect).vm.$emit('update:modelValue', 'P3')
    await flushPromises()
    const state = JSON.parse(localStorage.getItem('geo-workbench:agent')!)
    expect(state.strategies.find((item: { id: string }) => item.id === 'GS4').priority).toBe('P3')
    expect(state.reviews.GS4.at(-1).text).toContain('→ P3')
    wrapper.unmount()
    wrapper = mountLayout()
    await router.push('/diagnosis')
    await flushPromises()
    await wrapper.get('[data-test="review-priority"]').trigger('click')
    expect(wrapper.getComponent(PrioritySelect).props('modelValue')).toBe('P3')
  }
  finally { wrapper.unmount(); localStorage.clear() }
})

it('restores advice without putting it into pending work or allowing approval', async () => {
  localStorage.clear()
  // An existing browser snapshot predates the new advice category.
  localStorage.setItem('geo-workbench:agent', JSON.stringify({ findings: auditFindings.filter(item => item.route !== 'advice'), strategies, tasks: [], reviews: {} }))
  let context: import('../composables/workbench-route-context').GeoWorkbenchRouteContext | undefined
  const Probe = defineComponent({ setup() {
    context = inject(geoWorkbenchRouteContextKey)!
    return () => h('div')
  } })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: Probe }] })
  await router.push('/diagnosis')
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true, RouterLink: { template: '<a><slot /></a>' },
    GeoDrawer: { props: ['open'], template: '<div v-if="open" class="test-drawer"><slot /><footer><slot name="footer" /></footer></div>' },
  } } })
  try {
    await flushPromises()
    const items = context!.findings.filter(item => item.route === 'advice')
    expect(items).toHaveLength(1)
    const taskCount = context!.tasks.length
    const strategyCount = context!.strategies.length
    context!.selectAllFindings(items.map(item => item.id))
    expect(items.every(item => !item.checked)).toBe(true)
    for (const item of items) {
      context!.openAudit(item)
      await flushPromises()
      const drawer = wrapper.get('.test-drawer')
      expect(drawer.text()).toContain(item.advice!)
      expect(drawer.text()).toContain(item.evidence!)
      expect(drawer.text()).toContain('解决方案')
      expect(drawer.text()).toContain('已完成')
      expect(drawer.findAll('footer button').map(button => button.text())).toEqual(['关闭'])
    }
    context!.openPending()
    await flushPromises()
    for (const item of items) expect(wrapper.get('.test-drawer').text()).not.toContain(item.title)
    context!.approveSelectedFindings()
    expect(context!.tasks.length).toBe(taskCount)
    expect(context!.strategies.length).toBe(strategyCount)
  }
  finally { wrapper.unmount(); localStorage.clear() }
})


it('restores canonical review findings missing from an older snapshot', async () => {
  localStorage.clear()
  // Older snapshots can omit findings that were added later, including the
  // code-content review item F9. Loading the workbench must bring them back.
  localStorage.setItem('geo-workbench:agent', JSON.stringify({
    contentReviewReset: 1,
    findings: auditFindings.filter(item => !['F7-1', 'F8-2', 'F9'].includes(item.id)),
    strategies,
    tasks: [],
    reviews: {},
  }))
  let context: GeoWorkbenchRouteContext | undefined
  const Probe = defineComponent({ setup() {
    context = inject(geoWorkbenchRouteContextKey)!
    return () => h('div')
  } })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: Probe }] })
  await router.push('/diagnosis')
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true,
    RouterLink: true,
  } } })
  try {
    await flushPromises()
    expect(context!.findings.find(item => item.id === 'F7-1')).toBeTruthy()
    expect(context!.findings.find(item => item.id === 'F8-2')).toBeTruthy()
    expect(context!.findings.find(item => item.id === 'F9')).toMatchObject({
      route: 'strategy',
      treatment: 'website-content-review',
      category: '官网内容',
    })
    const findingIds = context!.findings.map(item => item.id)
    expect(findingIds.indexOf('F9')).toBeLessThan(findingIds.indexOf('FC-01'))
  }
  finally {
    wrapper.unmount()
    localStorage.clear()
  }
})

it('shows four code-review findings ready for confirmation', async () => {
  localStorage.clear()
  let context: GeoWorkbenchRouteContext | undefined
  const Probe = defineComponent({ setup() {
    context = inject(geoWorkbenchRouteContextKey)!
    return () => h('div')
  } })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: Probe }] })
  await router.push('/diagnosis')
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true,
    RouterLink: true,
  } } })
  try {
    await flushPromises()
    const exampleIds = new Set(['T-2601', 'T-2602', 'T-2603', 'T-2604'])
    expect(context!.tasks.filter(task => exampleIds.has(task.id))).toHaveLength(0)
    const queue = context!.findings.filter(finding => finding.id.startsWith('CR-'))
    expect(queue.map(finding => finding.id)).toEqual(['CR-01', 'CR-02', 'CR-03', 'CR-04'])
    expect(queue.map(finding => finding.title)).toEqual(['任务名称1', '任务名称2', '任务名称3', '任务名称4'])
    expect(queue.every(finding => finding.contentFormat === 'code')).toBe(true)
    expect(queue.every(finding => finding.status === '待处理')).toBe(true)
  }
  finally {
    wrapper.unmount()
    localStorage.clear()
  }
})

it('reopens code-review examples that an older snapshot had already processed', async () => {
  localStorage.clear()
  const legacyTasks = codeReviewDemoTasksFor().map(task => ({ ...task, origin: 'geo-audit' as const }))
  const legacyFindings = [...codeReviewTestFindings, ...auditFindings].map(finding => ({
    ...finding,
    status: finding.contentFormat === 'code' ? '已生成策略' as const : finding.status,
  }))
  localStorage.setItem('geo-workbench:agent', JSON.stringify({
    contentReviewReset: 1,
    findings: legacyFindings,
    strategies,
    tasks: legacyTasks,
    reviews: {},
  }))
  let context: GeoWorkbenchRouteContext | undefined
  const Probe = defineComponent({ setup() {
    context = inject(geoWorkbenchRouteContextKey)!
    return () => h('div')
  } })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: Probe }] })
  await router.push('/diagnosis')
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true,
    RouterLink: true,
  } } })
  try {
    await flushPromises()
    expect(context!.tasks.filter(task => /^CR-0[1-4]$/.test(task.source)).map(task => task.id)).toEqual([])
    const queue = context!.findings.filter(finding => finding.id.startsWith('CR-'))
    expect(queue.every(finding => finding.status === '待处理')).toBe(true)
    const saved = JSON.parse(localStorage.getItem('geo-workbench:agent')!)
    expect(saved.codeReviewReset).toBe(2)
    expect(saved.tasks.filter((task: { source: string }) => /^CR-0[1-4]$/.test(task.source))).toEqual([])
  }
  finally {
    wrapper.unmount()
    localStorage.clear()
  }
})

it('records cause verification in the strategy drawer without creating an optimisation task', async () => {
  localStorage.clear()
  let context!: GeoWorkbenchRouteContext
  const Probe = defineComponent({ setup() { context = inject(geoWorkbenchRouteContextKey)!; return () => h('div') } })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: Probe }] })
  await router.push('/diagnosis')
  await router.isReady()
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true,
    RouterLink: true,
    GeoDrawer: { props: ['open', 'title', 'subtitle', 'eyebrow', 'size', 'titleFirst'], template: '<div v-if="open" class="test-drawer"><header><h2>{{ title }}</h2></header><slot /><footer><slot name="footer" /></footer></div>' },
  } } })
  try {
    await flushPromises()
    const strategy = context.strategies.find(item => item.id === 'GS6')!
    const taskCount = context.tasks.length
    context.openStrategy(strategy)
    await flushPromises()

    let drawer = wrapper.get('.test-drawer')
    expect(drawer.text()).toContain('原因核查')
    expect(drawer.get('.geo-strategy-recommendation').text()).toContain('结论仅作提醒')
    expect(drawer.find('[data-test="strategy-verification-record"]').exists()).toBe(false)
    const saveButton = drawer.findAll('footer button').find(button => button.text() === '保存核查结论并完成')!
    expect(saveButton.attributes('disabled')).toBeDefined()

    await drawer.get('[data-test="strategy-verification-outcome"]').setValue('add-content')
    await drawer.get('[data-test="strategy-verification-note"] textarea').setValue('已核对原始回答和官网页面，确认能力存在但官网未介绍。')
    expect(saveButton.attributes('disabled')).toBeUndefined()
    await saveButton.trigger('click')
    await flushPromises()

    expect(context.tasks).toHaveLength(taskCount)
    expect(context.tasks.some(task => task.strategy === strategy.id || task.relatedStrategies.includes(strategy.id))).toBe(false)
    expect(strategy.verification).toMatchObject({ outcome: 'add-content', note: '已核对原始回答和官网页面，确认能力存在但官网未介绍。' })
    expect(strategy.confirmed).toBe(true)
    expect(wrapper.find('.test-drawer').exists()).toBe(false)
    expect(wrapper.get('.geo-toast').text()).toContain('仅作提醒，不会生成后续任务或流程')
    expect(JSON.parse(localStorage.getItem('geo-workbench:agent')!).strategies.find((item: { id: string }) => item.id === 'GS6').verification.outcome).toBe('add-content')

    context.openStrategy(strategy)
    await flushPromises()
    drawer = wrapper.get('.test-drawer')
    expect(drawer.find('[data-test="strategy-verification"]').exists()).toBe(false)
    const record = drawer.get('[data-test="strategy-verification-record"]')
    expect(record.text()).toContain('官网具备该能力，但尚未介绍')
    expect(record.text()).toContain('已核对原始回答和官网页面，确认能力存在但官网未介绍。')
    expect(record.text()).toContain('仅作记录和提醒')
    expect(drawer.findAll('footer button').map(button => button.text())).not.toContain('查看关联任务')
    expect(drawer.get('.geo-strategy-drawer__status').text()).toBe('已完成')
  }
  finally {
    wrapper.unmount()
    localStorage.clear()
  }
})
