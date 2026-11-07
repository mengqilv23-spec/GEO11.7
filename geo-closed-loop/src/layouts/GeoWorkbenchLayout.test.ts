import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, inject } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { geoWorkbenchRouteContextKey } from '../composables/workbench-route-context'
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
    const repairApproval = wrapper.findAll('.test-drawer footer button').find(button => button.text() === '审核通过并生成任务')
    expect(repairApproval).toBeUndefined()
    expect(taskStore.tasks.length).toBe(initialTaskCount)

    const countBeforeBulkApproval = taskStore.tasks.length
    await wrapper.get('[data-test="select-bulk-findings"]').trigger('click')
    await wrapper.get('[data-test="approve-bulk-findings"]').trigger('click')
    expect(taskStore.tasks.length).toBe(countBeforeBulkApproval)
    expect(wrapper.find('.geo-toast').text()).toContain('请选择至少一条可审核的问题')

    await wrapper.get('[data-test="open-strategy-finding"]').trigger('click')
    const findingDrawer = wrapper.get('.test-drawer')
    expect(findingDrawer.get('small').text()).toBe('异常4')
    expect(findingDrawer.get('header').element.firstElementChild?.tagName).toBe('H2')
    expect(findingDrawer.get('h2').text()).toBe('异常处理 · 专家作者档案待补')
    expect(findingDrawer.text()).toContain('⑤ 品牌实体')
    expect(findingDrawer.text()).toContain('已生成任务')
    expect(findingDrawer.text()).toContain('2 位工程师已有内容贡献，但缺少可验证的专业背景、经验与作者介绍。')
    expect(findingDrawer.text()).toContain('需要确认专家范围、身份事实和对外介绍方式。')
    expect(findingDrawer.text()).not.toContain('后续流程')
    expect(wrapper.findAll('.test-drawer footer button').some(button => button.text() === '忽略')).toBe(false)
    const strategyApproval = wrapper.findAll('.test-drawer footer button').find(button => button.text() === '审核通过并生成任务')
    expect(strategyApproval).toBeUndefined()
    expect(wrapper.findAll('.test-drawer footer button').some(button => button.text() === '进入任务')).toBe(true)
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
    expect(drawer.get('small').text()).toBe('认知缺口策略 10')
    expect(drawer.get('p').text()).toBe('')
    expect(drawer.get('h2').text()).toBe('交期页增加汽车工艺停机风险与服务问答')
    expect(drawer.findAll('.geo-strategy-detail-card__header').map(header => header.text())).toEqual([
      '认知缺口策略已生成任务',
      'Agent 建议方法',
      '策略依据',
    ])
    expect(drawer.get('.geo-strategy-evidence__platforms').text()).toContain('全部平台汇总')
    expect(drawer.get('.geo-strategy-evidence__platforms').text()).toContain('ChatGPT')
    expect(drawer.find('.geo-strategy-status').exists()).toBe(false)
    expect(drawer.find('.geo-strategy-drawer__status').text()).toBe('已生成任务')
    expect(drawer.get('.geo-strategy-detail-grid').text()).toContain('策略类型官网内容')
    expect(drawer.get('.geo-strategy-detail-grid').text()).toContain('目标人设汽车工艺、车间主管')
    expect(drawer.get('.geo-strategy-recommendation').text()).toBe('建议采用停机风险 Q&A、服务问答、买家场景补充等方式，完成本次官网内容优化。')
    expect(drawer.text()).not.toContain('审核与协作记录')
    expect(wrapper.findAll('.test-drawer footer button').some(button => button.text() === '忽略')).toBe(false)
    wrapper.unmount()
  })
})

it('separates product versions from roles and keeps changes scoped to the two review modules', async () => {
  localStorage.clear()
  const probe = defineComponent({
    setup() {
      const context = inject(geoWorkbenchRouteContextKey)!
      return () => h('div', [
        h('span', { 'data-test': 'mode-role' }, `${context.serviceMode.value}/${context.role.value}`),
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
    GeoWorkbenchToolbar: { emits: ['update:serviceMode'], template: '<button data-test="select-client" @click="$emit(\'update:serviceMode\', \'agent\')">客户版</button>' },
    GeoDrawer: true, RouterLink: true,
  } } })
  await wrapper.get('[data-test="select-client"]').trigger('click')
  await flushPromises()
  expect(wrapper.get('[data-test="mode-role"]').text()).toBe('agent/client')
  await wrapper.get('[data-test="choose-finding"]').trigger('click')
  expect(wrapper.get('[data-test="selected"]').text()).toBe('false')
  await wrapper.get('[data-test="adopt-strategy"]').trigger('click')
  await flushPromises()
  const customerState = JSON.parse(localStorage.getItem('geo-workbench:agent')!)
  expect(customerState.strategies.find((item: { id: string }) => item.id === 'GS4').confirmed).toBe(true)
  expect(customerState.reviews.GS4.at(-1).name).toBe('客户')
  await router.push('/overview')
  await flushPromises()
  expect(wrapper.get('[data-test="mode-role"]').text()).toBe('managed/ops')
  expect(wrapper.get('[data-test="selected"]').text()).toBe('false')
  await router.push('/diagnosis')
  await flushPromises()
  expect(wrapper.get('[data-test="mode-role"]').text()).toBe('agent/client')
  expect(wrapper.get('[data-test="selected"]').text()).toBe('false')
  wrapper.unmount()
  localStorage.clear()
})


it.each(['client', 'managed'])('runs direct technical repairs without human approval in %s version', async (version) => {
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
  await router.push(`/diagnosis?version=${version}`)
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
    expect(wrapper.get('.test-drawer').text()).toContain('AI建站处理中')
    for (const id of ['F7-1', 'F7-2', 'F8-1'])
      expect(wrapper.get(`[data-test="${id}"]`).text()).toBe('待官网运营审核')
    await wrapper.get('[data-test="F8-3"]').trigger('click')
    expect(wrapper.get('.test-drawer').text()).toContain('已完成处理')
    const repairs = useWorkbenchTasksStore().tasks.filter(t => t.type === 'repair' && t.source.includes('F7-'))
    expect(repairs).toHaveLength(1)
    expect(repairs[0]?.progress).toBe('site_running')
  }
  finally { wrapper.unmount(); vi.useRealTimers() }
})


it.each(['client', 'managed'])('persists reviewer priority changes including P3 in %s version', async (version) => {
  localStorage.clear()
  const probe = defineComponent({ setup() {
    const context = inject(geoWorkbenchRouteContextKey)!
    return () => h('button', { 'data-test': 'review-priority', onClick: () => context.openStrategy(context.strategies.find(item => item.id === 'GS4')!) }, '审核')
  } })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: probe }] })
  await router.push(`/diagnosis?version=${version}`)
  const mountLayout = () => mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true, RouterLink: true,
    GeoDrawer: { props: ['open'], template: '<div v-if="open"><slot /><slot name="footer" /></div>' },
  } } })
  let wrapper = mountLayout()
  try {
    await wrapper.get('[data-test="review-priority"]').trigger('click')
    wrapper.getComponent(PrioritySelect).vm.$emit('update:modelValue', 'P3')
    await flushPromises()
    const key = `geo-workbench:${version === 'client' ? 'agent' : 'managed'}`
    const state = JSON.parse(localStorage.getItem(key)!)
    expect(state.strategies.find((item: { id: string }) => item.id === 'GS4').priority).toBe('P3')
    expect(state.reviews.GS4.at(-1).text).toContain('→ P3')
    wrapper.unmount()
    wrapper = mountLayout()
    await router.push(`/diagnosis?version=${version}`)
    await flushPromises()
    await wrapper.get('[data-test="review-priority"]').trigger('click')
    expect(wrapper.getComponent(PrioritySelect).props('modelValue')).toBe('P3')
    if (version === 'managed') {
      wrapper.findComponent({ name: 'GeoWorkbenchToolbar' }).vm.$emit('update:role', 'client')
      await flushPromises()
      expect(wrapper.findComponent(PrioritySelect).exists()).toBe(false)
    }
  }
  finally { wrapper.unmount(); localStorage.clear() }
})

it.each(['managed', 'agent'] as const)('restores advice into %s without putting it into pending work or allowing approval', async (mode) => {
  localStorage.clear()
  // An existing browser snapshot predates the new advice category.
  localStorage.setItem(`geo-workbench:${mode}`, JSON.stringify({ findings: auditFindings.filter(item => item.route !== 'advice'), strategies, tasks: [], reviews: {} }))
  let context: import('../composables/workbench-route-context').GeoWorkbenchRouteContext | undefined
  const Probe = defineComponent({ setup() {
    context = inject(geoWorkbenchRouteContextKey)!
    return () => h('div')
  } })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: Probe }] })
  await router.push(`/diagnosis?version=${mode === 'agent' ? 'client' : 'managed'}`)
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true, RouterLink: { template: '<a><slot /></a>' },
    GeoDrawer: { props: ['open'], template: '<div v-if="open" class="test-drawer"><slot /><footer><slot name="footer" /></footer></div>' },
  } } })
  try {
    await flushPromises()
    const items = context!.findings.filter(item => item.route === 'advice')
    expect(items).toHaveLength(mode === 'agent' ? 1 : 2)
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
      expect(drawer.text()).toContain('无需处理')
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

