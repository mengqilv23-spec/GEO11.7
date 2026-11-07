import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent, h, inject } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { expect, it } from 'vitest'
import type { GeoWorkbenchRouteContext } from '../composables/workbench-route-context'
import { geoWorkbenchRouteContextKey } from '../composables/workbench-route-context'
import { canPrepareBrief, ensureWorkflow } from '../workflows/task-workflow'
import GeoWorkbenchLayout from './GeoWorkbenchLayout.vue'

it('resets once, links a reviewed F9 to customer Brief, and preserves the result after reload', async () => {
  localStorage.clear()
  async function setup() {
    let context!: GeoWorkbenchRouteContext
    const Probe = defineComponent({ setup() { context = inject(geoWorkbenchRouteContextKey)!; return () => h('div') } })
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: Probe }] })
    await router.push('/diagnosis?version=client')
    const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
      GeoWorkbenchToolbar: true, RouterLink: true,
      GeoDrawer: { props: ['open'], template: '<section v-if="open" class="test-drawer"><slot /><footer><slot name="footer" /></footer></section>' },
    } } })
    await flushPromises()
    return { wrapper, context }
  }
  const first = await setup()
  try {
    expect(first.context.tasks.every(task => task.type === 'repair' && task.source !== 'F9')).toBe(true)
    expect(first.context.strategies.every(strategy => !strategy.confirmed)).toBe(true)
    const finding = first.context.findings.find(item => item.id === 'F9')!
    first.context.openAudit(finding)
    await flushPromises()
    await first.wrapper.findAll('.test-drawer footer button').find(button => button.text() === '审核通过并生成任务')!.trigger('click')
    const task = first.context.tasks.find(task => task.source === 'F9')!
    expect(task.progress).toBe('brief')
    ensureWorkflow(task)
    expect(canPrepareBrief(task, 'client', 'agent')).toBe(true)
    expect(finding.status).toBe('已生成策略')
    first.context.openAudit(finding)
    await flushPromises()
    expect(first.wrapper.get('.test-drawer').text()).toContain('已生成任务')
    expect(first.wrapper.get('.test-drawer').text()).toContain('去确认 Brief')
    expect(first.wrapper.findAll('.test-drawer footer button').some(button => button.text() === '审核通过并生成任务')).toBe(false)
    const savedCount = first.context.tasks.length
    first.wrapper.unmount()
    const second = await setup()
    try {
      expect(second.context.tasks.length).toBe(savedCount)
      expect(second.context.tasks.find(item => item.id === task.id)?.progress).toBe('brief')
    } finally { second.wrapper.unmount() }
  } finally { first.wrapper.unmount(); localStorage.clear() }
})

it('shows the selected strategy GAP and evidence summary in its review drawer', async () => {
  localStorage.clear()
  const Probe = defineComponent({
    setup() {
      const context = inject(geoWorkbenchRouteContextKey)!
      return () => h('button', { onClick: () => context.openStrategy(context.strategies.find(item => item.id === 'GS1')!) }, '审核 GS1')
    },
  })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: Probe }] })
  await router.push('/diagnosis?version=client')
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true, RouterLink: true,
    GeoDrawer: { props: ['open'], template: '<section v-if="open" class="test-drawer"><slot /><footer><slot name="footer" /></footer></section>' },
  } } })
  try {
    await wrapper.get('button').trigger('click')
    const drawer = wrapper.get('.test-drawer')
    expect(drawer.get('.geo-strategy-evidence__gap').text()).toContain('认证与合规')
    expect(drawer.get('.geo-strategy-evidence__gap').text()).toContain('Gap +')
    const platforms = drawer.findAll('.geo-strategy-evidence__platform')
    expect(platforms).toHaveLength(4)
    expect(platforms.map(row => row.get('strong').text())).toEqual(['全部平台汇总', 'ChatGPT', 'Perplexity', 'Google AI'])
    expect(platforms[0]!.text()).toContain('有效回答 100 条')
    expect(platforms.slice(1).map(row => Number(row.text().match(/有效回答 (\d+) 条/)?.[1])).reduce((sum, count) => sum + count, 0)).toBe(100)
    expect(drawer.get('.geo-strategy-evidence__snapshot').text()).toContain('页面被 Perplexity 引为来源，但回答只推荐 Flow')
    expect(drawer.get('.geo-strategy-evidence__snapshot').text()).toContain('未接入该策略对应的回答原文')
  } finally { wrapper.unmount(); localStorage.clear() }
})

it('requires operations and then customer approval before creating a managed strategy task', async () => {
  localStorage.clear()
  let context!: GeoWorkbenchRouteContext
  const Probe = defineComponent({ setup() { context = inject(geoWorkbenchRouteContextKey)!; return () => h('div') } })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: Probe }] })
  await router.push('/diagnosis?version=managed')
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true, RouterLink: true,
    GeoDrawer: { props: ['open'], template: '<section v-if="open" class="test-drawer"><slot /><footer><slot name="footer" /></footer></section>' },
  } } })
  try {
    const strategy = { ...context.strategies.find(item => item.id === 'GS1')!, id: 'GS-MANAGED-REVIEW', confirmed: false, ignored: false, reviewStage: undefined }
    context.strategies.push(strategy)
    const before = context.tasks.length
    context.confirmStrategy(strategy)
    expect(strategy.reviewStage).toBe('customer')
    expect(context.tasks.length).toBe(before)
    context.role.value = 'client'
    await flushPromises()
    context.confirmStrategy(strategy)
    expect(strategy.confirmed).toBe(true)
    expect(context.tasks.some(task => task.strategy === strategy.id || task.relatedStrategies.includes(strategy.id))).toBe(true)
    expect(context.tasks.length).toBeGreaterThanOrEqual(before)
  } finally { wrapper.unmount(); localStorage.clear() }
})

it('requires customer approval after operations reviews a managed website content finding', async () => {
  localStorage.clear()
  let context!: GeoWorkbenchRouteContext
  const Probe = defineComponent({ setup() { context = inject(geoWorkbenchRouteContextKey)!; return () => h('div') } })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: Probe }] })
  await router.push('/diagnosis?version=managed')
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true, RouterLink: true,
    GeoDrawer: { props: ['open'], template: '<section v-if="open" class="test-drawer"><slot /><footer><slot name="footer" /></footer></section>' },
  } } })
  try {
    const finding = context.findings.find(item => item.id === 'FC-01')!
    expect(finding.category).toBe('官网内容')
    const before = context.tasks.length
    context.openAudit(finding)
    await flushPromises()
    await wrapper.findAll('.test-drawer footer button').find(button => button.text() === '审核通过，交客户审核')!.trigger('click')
    expect(finding.status).toBe('待客户审核')
    expect(context.tasks.length).toBe(before)
    context.role.value = 'client'
    context.openAudit(finding)
    await flushPromises()
    await wrapper.findAll('.test-drawer footer button').find(button => button.text() === '审核通过并生成任务')!.trigger('click')
    expect(finding.status).toBe('已生成策略')
    expect(context.tasks.length).toBeGreaterThan(before)
    expect(context.tasks.find(task => task.source.split(' / ').includes(finding.id))?.progress).toBe('brief')
  } finally { wrapper.unmount(); localStorage.clear() }
})

it('creates a task when the customer approves a managed F9 address finding', async () => {
  localStorage.clear()
  let context!: GeoWorkbenchRouteContext
  const Probe = defineComponent({ setup() { context = inject(geoWorkbenchRouteContextKey)!; return () => h('div') } })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/diagnosis', name: 'diagnosis', component: Probe }] })
  await router.push('/diagnosis?version=managed')
  const wrapper = mount(GeoWorkbenchLayout, { global: { plugins: [createPinia(), router], stubs: {
    GeoWorkbenchToolbar: true, RouterLink: true,
    GeoDrawer: { props: ['open'], template: '<section v-if="open" class="test-drawer"><slot /><footer><slot name="footer" /></footer></section>' },
  } } })
  try {
    const finding = context.findings.find(item => item.id === 'F9')!
    finding.status = '待客户审核'
    context.role.value = 'client'
    context.openAudit(finding)
    await flushPromises()
    await wrapper.findAll('.test-drawer footer button').find(button => button.text() === '审核通过并生成任务')!.trigger('click')
    expect(context.tasks.some(task => task.source.includes('F9'))).toBe(true)
    expect(finding.status).toBe('已生成策略')
    context.openAudit(finding)
    await flushPromises()
    expect(wrapper.get('.test-drawer').text()).toContain('已生成任务')
  } finally { wrapper.unmount(); localStorage.clear() }
})

