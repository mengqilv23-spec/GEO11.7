import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { auditFindings, personas, prototypeTasks, strategies } from '../../../data/geo-data'
import DiagnosisContent from './DiagnosisContent.vue'

describe('diagnosisContent icons', () => {
  it('renders SVG check and warning marks while keeping check labels visible', () => {
    const wrapper = mount(DiagnosisContent, {
      props: {
        findings: auditFindings,
        personas,
        activePersona: personas[0]!.id,
        strategies,
        strategyLayer: '全部',
        serviceMode: 'managed',
        role: 'ops',
      },
      global: {
        plugins: [createPinia()],
        stubs: { DeferredGeoRadarChart: true, DataList: true, Pagination: true, Tooltip: { template: '<span><slot /></span>' } },
      },
    })

    expect(wrapper.get('.geo-diagnosis-summary').classes()).toContain('geo-diagnosis-summary')
    expect(wrapper.get('.geo-diagnosis-summary__header').text()).toContain('本轮监测')
    expect(wrapper.find('.geo-pending-entry').exists()).toBe(false)
    expect(wrapper.get('.geo-diagnosis-summary').text()).not.toContain('暂停监测')
    expect(wrapper.get('.geo-diagnosis-summary').text()).toContain('2026-10-02')
    expect(wrapper.get('.geo-diagnosis-summary').text()).toContain('采样总数1138')
    expect(wrapper.get('.geo-diagnosis-summary').text()).toContain('中 · 趋势级')
    expect(wrapper.findAll('.geo-check strong svg').length).toBe(7)
    expect(wrapper.findAll('.geo-check strong svg.lucide-triangle-alert').length).toBeGreaterThan(0)
    expect(wrapper.find('.geo-page-intro h1 svg.lucide-circle-question-mark').exists()).toBe(true)
    expect(wrapper.find('.geo-page-intro h1 .geo-help').exists()).toBe(false)
    expect(wrapper.get('.geo-page-intro h1 .overview-info-icon').attributes('aria-label')).toBe('诊断与策略说明')
    expect(wrapper.get('#audit-title .geo-section-heading__number').text()).toBe('1')
    expect(wrapper.get('#persona-title .geo-section-heading__number').text()).toBe('2')
    expect(wrapper.get('#persona-title').text()).toContain('买家关注点与品牌表现')
    expect(wrapper.find('.geo-persona-panel__subtitle').exists()).toBe(false)
    expect(wrapper.get('#persona-title .geo-help').attributes('aria-label')).toBe('认知 GAP 说明')
    expect(wrapper.get('#strategy-title .geo-section-heading__number').text()).toBe('3')
    expect(wrapper.get('#strategy-title .geo-help').text()).toBe('?')
    expect(wrapper.find('.geo-page-description').exists()).toBe(false)
    expect(wrapper.findAll('.geo-metric--button')).toHaveLength(0)
    expect(wrapper.text()).toContain('抓取渲染')
  })

  it('opens finding and strategy details and removes the candidate-generation bulk button', async () => {
    const wrapper = mount(DiagnosisContent, {
      props: {
        findings: auditFindings.map(item => ({ ...item })),
        personas,
        activePersona: personas[0]!.id,
        strategies: strategies.map(item => ({ ...item })),
        strategyLayer: '全部',
        serviceMode: 'managed',
        role: 'ops',
      },
      global: {
        plugins: [createPinia()],
        stubs: { DeferredGeoRadarChart: true, Pagination: true, Tooltip: { template: '<span><slot /></span>' } },
      },
    })

    expect(wrapper.findAll('.geo-finding-actions button').map(button => button.text())).not.toContain('生成候选策略')
    expect(wrapper.findAll('.geo-strategy-context button')).toHaveLength(0)
    expect(wrapper.get('.geo-finding-table thead .geo-finding-action-column').text()).toBe('操作')
    expect(wrapper.get('.geo-finding-table thead .geo-finding-id').text()).toBe('序号')
    expect(wrapper.get('.geo-finding-table tbody .geo-finding-id').text()).toBe('F-17-1')
    expect(wrapper.get('.geo-finding-table tbody .geo-finding-action-column').text()).toContain('查看详情')

    const findingDetails = wrapper.find('.geo-finding-table tbody tr button')
    expect(findingDetails.text()).toBe('查看详情')
    expect(findingDetails.attributes('data-variant')).toBe('secondary')
    expect(findingDetails.attributes('data-size')).toBe('md')
    expect(findingDetails.classes()).toContain('geo-finding-detail-button')
    expect(findingDetails.classes()).toContain('geo-table-detail-button')
    await findingDetails.trigger('click')
    expect(wrapper.emitted('openAudit')).toHaveLength(1)

    const strategyDetails = wrapper.findAll('.geo-strategy-table tbody tr button').find(button => button.text() === '审核')
    expect(strategyDetails).toBeDefined()
    expect(strategyDetails!.attributes('data-variant')).toBe('secondary')
    expect(strategyDetails!.attributes('data-size')).toBe('md')
    expect(strategyDetails!.classes()).toContain('geo-table-detail-button')
    expect(wrapper.find('.geo-strategy-table tbody button[data-variant="primary"]').exists()).toBe(false)
    await strategyDetails!.trigger('click')
    expect(wrapper.emitted('openStrategy')).toHaveLength(1)
  })

  it('shows a count-free bulk approval action for selected findings', async () => {
    const wrapper = mount(DiagnosisContent, {
      props: {
        findings: auditFindings.filter(item => item.route === 'strategy' || item.id === 'F9').slice(0, 2).map(item => ({ ...item, checked: true })),
        personas,
        activePersona: personas[0]!.id,
        strategies,
        strategyLayer: '全部',
        serviceMode: 'managed',
        role: 'ops',
      },
      global: {
        plugins: [createPinia()],
        stubs: { DeferredGeoRadarChart: true, Pagination: true, Tooltip: { template: '<span><slot /></span>' } },
      },
    })

    const approval = wrapper.findAll('.geo-finding-actions button').find(button => button.text() === '审核通过并生成任务')
    expect(approval).toBeDefined()
    expect(approval!.attributes('data-variant')).toBe('secondary')
    expect(approval!.attributes('data-size')).toBe('md')
    expect(approval!.classes()).toContain('geo-finding-approve-button')
    expect(approval!.classes()).toContain('geo-table-detail-button')
    expect(wrapper.find('.geo-finding-head').text()).not.toContain('条异常')
    expect(wrapper.get('.geo-finding-selection-count').text()).toBe('已选 2')
    expect(wrapper.findAll('.geo-finding-actions button').map(button => button.text())).not.toContain('直接处理')
    await approval!.trigger('click')
    expect(wrapper.emitted('approveSelectedFindings')).toHaveLength(1)
    wrapper.unmount()
  })

  it.each(['agent', 'managed'] as const)('shows linked tasks as processing even with a legacy unconfirmed flag in %s', (mode) => {
    const wrapper = mount(DiagnosisContent, {
      props: {
        findings: auditFindings,
        personas,
        activePersona: personas[0]!.id,
        strategies: strategies.filter(strategy => strategy.id === 'GS11').map(strategy => ({ ...strategy, confirmed: false })),
        tasks: prototypeTasks,
        strategyLayer: '全部',
        serviceMode: mode,
        role: mode === 'agent' ? 'client' : 'ops',
      },
      global: {
        plugins: [createPinia()],
        stubs: { DeferredGeoRadarChart: true, Pagination: true, Tooltip: { template: '<span><slot /></span>' } },
      },
    })

    const linkedTask = wrapper.findAll('.geo-strategy-table tbody button').find(button => button.text() === '查看任务')
    expect(wrapper.get('.geo-strategy-table tbody').text()).toContain('处理中')
    expect(wrapper.get('.geo-strategy-table tbody').text()).not.toContain('待客户审核')
    expect(wrapper.findAll('.geo-strategy-table tbody button').some(button => button.text() === '审核')).toBe(false)
    expect(wrapper.get('.geo-strategy-table tbody .ce-tag').attributes('data-tone')).toBe('blue')
    expect(linkedTask).toBeDefined()
    expect(linkedTask!.attributes('data-variant')).toBe('secondary')
    expect(linkedTask!.attributes('data-size')).toBe('md')
    expect(linkedTask!.classes()).toContain('geo-table-detail-button')
  })
})

describe('buyer stage filter', () => {
  it('filters buyer personas by stage and selects the first visible persona', async () => {
    const wrapper = mount(DiagnosisContent, {
      props: { findings: [], personas, activePersona: 'engineering', strategies, strategyLayer: '全部', serviceMode: 'agent', role: 'client' },
      global: { plugins: [createPinia()], stubs: { DeferredGeoRadarChart: true, Tooltip: { template: '<span><slot /></span>' } } },
    })

    const stageSelect = wrapper.get('[aria-label="买家阶段筛选"]')
    expect(stageSelect.findAll('option').map(option => option.text())).toEqual([
      '全部阶段',
      '需求识别',
      '方案寻找',
      '供应商评估',
      '采购决策',
    ])
    expect(wrapper.findAll('.geo-personas button')).toHaveLength(personas.length)
    expect(wrapper.findAll('.geo-personas button small').map(label => label.text())).toContain('供应商评估 · 4 Gap')

    await stageSelect.setValue('purchase-decision')
    expect(wrapper.findAll('.geo-personas button strong').map(name => name.text())).toEqual(['航空采购'])
    expect(wrapper.get('.geo-personas button small').text()).toBe('采购决策 · 4 Gap')
    expect(wrapper.get('.geo-personas button').attributes('aria-selected')).toBe('true')
    expect(wrapper.emitted('selectPersona')?.at(-1)).toEqual(['procurement'])

    await stageSelect.setValue('requirement-identification')
    expect(wrapper.findAll('.geo-personas button strong').map(name => name.text())).toEqual(['车间主管'])
    expect(wrapper.get('.geo-personas button small').text()).toBe('需求识别 · 4 Gap')
    expect(wrapper.emitted('selectPersona')?.at(-1)).toEqual(['distributor'])
    wrapper.unmount()
  })
})

describe('advice-only findings in both products', () => {
  it.each([
    ['managed', 'ops'], ['managed', 'client'], ['agent', 'client'],
  ] as const)('shows read-only advice in %s / %s', async (serviceMode, role) => {
    const wrapper = mount(DiagnosisContent, {
      props: {
        findings: auditFindings.map(item => ({ ...item })), personas, activePersona: personas[0]!.id,
        strategies, strategyLayer: '全部', serviceMode, role,
      },
      global: { plugins: [createPinia()], stubs: { DeferredGeoRadarChart: true, Tooltip: { template: '<span><slot /></span>' } } },
    })
    await wrapper.get('[aria-label="处理方式筛选"]').setValue('advice')
    const rows = wrapper.findAll('.geo-finding-table tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows.map(row => row.get('.geo-route-badge').text())).toEqual([
      '官网技术与结构 · 仅提供建议', '官网内容 · 仅提供建议',
    ])
    for (const row of rows) {
      expect(row.get('.geo-finding-status').text()).toBe('已完成')
      expect(row.get('button').text()).toBe('查看建议')
      const checkbox = row.find('input[type="checkbox"]')
      if (checkbox.exists()) expect(checkbox.attributes('disabled')).toBeDefined()
    }
    expect(wrapper.find('.geo-finding-approve-button').exists()).toBe(false)
    await rows[1]!.get('button').trigger('click')
    expect(wrapper.emitted('openAudit')?.[0]?.[0]).toMatchObject({ id: 'F8-4', route: 'advice' })
    wrapper.unmount()
  })
})

it('shows knowledge supplementation as a reminder without an approval action', async () => {
  const wrapper = mount(DiagnosisContent, {
    props: { findings: auditFindings.map(item => ({ ...item })), personas, activePersona: personas[0]!.id, strategies, strategyLayer: '全部', serviceMode: 'agent', role: 'client' },
    global: { plugins: [createPinia()], stubs: { DeferredGeoRadarChart: true, Tooltip: { template: '<span><slot /></span>' } } },
  })
  await wrapper.get('[aria-label="处理方式筛选"]').setValue('knowledge')
  const rows = wrapper.findAll('.geo-finding-table tbody tr')
  expect(rows).toHaveLength(1)
  expect(rows[0]!.text()).toContain('待补充知识')
  expect(rows[0]!.get('button').text()).toBe('查看补充要求')
  expect(rows[0]!.get('input').attributes('disabled')).toBeDefined()
  await rows[0]!.get('button').trigger('click')
  expect(wrapper.emitted('openAudit')?.[0]?.[0]).toMatchObject({ route: 'knowledge' })
  wrapper.unmount()
})

it('shows details instead of review when an existing strategy already has a Brief task', async () => {
  const finding = { ...auditFindings.find(item => item.id === 'F8-2')!, checked: true }
  const wrapper = mount(DiagnosisContent, {
    props: { findings: [finding], personas, activePersona: personas[0]!.id, strategies, strategyLayer: '全部', serviceMode: 'agent', role: 'client', tasks: [{ id: 'T-sync', name: finding.title, type: 'web', source: finding.id, strategy: 'GS14', persona: '', factor: '', methods: [], destination: '官网内容', progress: 'brief', relatedStrategies: ['GS14'] }] },
    global: { plugins: [createPinia()], stubs: { DeferredGeoRadarChart: true, Tooltip: { template: '<span><slot /></span>' } } },
  })
  const row = wrapper.get('.geo-finding-table tbody tr')
  expect(row.get('button').text()).toBe('查看详情')
  expect(row.text()).toContain('处理中')
  expect(row.get('input').attributes('disabled')).toBeDefined()
  expect(wrapper.find('.geo-finding-approve-button').exists()).toBe(false)
  wrapper.unmount()
})

it('shows only a pass result rather than an empty problem table for a healthy client check', async () => {
  const wrapper = mount(DiagnosisContent, {
    props: { findings: [], personas, activePersona: personas[0]!.id, strategies, strategyLayer: '全部', serviceMode: 'agent', role: 'client' },
    global: { plugins: [createPinia()], stubs: { DeferredGeoRadarChart: true, Tooltip: { template: '<span><slot /></span>' } } },
  })
  await wrapper.findAll('.geo-check')[0]!.trigger('click')
  expect(wrapper.get('.geo-check-pass-result').text()).toBe('通过')
  expect(wrapper.find('.geo-finding-table').exists()).toBe(false)
  expect(wrapper.text()).not.toContain('当前筛选下没有问题或建议')
  expect(wrapper.text()).not.toContain('买家重视度')
  wrapper.unmount()
})

it('focuses a topic and filters its strategies without opening a separate answer drawer', async () => {
  const wrapper = mount(DiagnosisContent, {
    props: { findings: [], personas, activePersona: personas[0]!.id, strategies, strategyLayer: '全部', serviceMode: 'agent', role: 'client' },
    global: { plugins: [createPinia()], stubs: {
      DeferredGeoRadarChart: true,
      Tooltip: { template: '<span><slot /></span>' },
    } },
  })
  const initial = wrapper.findAll('.geo-strategy-table tbody tr').length
  const strategyGapBefore = wrapper.find('.geo-strategy-table tbody .geo-gap-link').text()
  const radarFactors = wrapper.findComponent({ name: 'DeferredGeoRadarChart' }).props('factors') as Array<{ name: string, coverage: number, competitor: number }>
  expect(radarFactors).toHaveLength(personas[0]!.factors.length - 1)
  expect(radarFactors.some(factor => factor.name === '切割精度' && factor.coverage > factor.competitor)).toBe(true)
  expect(wrapper.findAll('.client-gap-row').every(row => !row.text().includes('其他'))).toBe(true)
  expect(wrapper.findAll('.client-gap-row').every(row => Number(row.text().match(/Gap\s+(\d+)/)?.[1]) > 0)).toBe(true)
  await wrapper.find('.client-gap-row').trigger('click')
  expect(wrapper.find('.test-drawer').exists()).toBe(false)
  expect(wrapper.text()).not.toContain('演示回答索引')
  expect(wrapper.get('.geo-strategy-context').text()).toContain('聚焦：')
  expect(wrapper.findAll('.geo-strategy-table tbody tr').length).toBeLessThan(initial)
  await wrapper.find('.geo-strategy-context button').trigger('click')
  expect(wrapper.findAll('.geo-strategy-table tbody tr').length).toBe(initial)
  await wrapper.get('[aria-label="按 AI 平台筛选主题差距"]').setValue('ChatGPT')
  expect(wrapper.get('[aria-label="按 AI 平台筛选主题差距"]').element).toHaveProperty('value', 'ChatGPT')
  const platformRadarFactors = wrapper.findComponent({ name: 'DeferredGeoRadarChart' }).props('factors') as Array<{ name: string, coverage: number, competitor: number }>
  expect(platformRadarFactors).toHaveLength(radarFactors.length)
  expect(platformRadarFactors.find(factor => factor.name === '切割精度')?.coverage).toBeCloseTo(88.24, 2)
  expect(wrapper.findAll('.client-gap-row').length).toBeGreaterThan(0)
  expect(wrapper.get('.geo-strategy-context').text()).not.toContain('聚焦：')
  expect(wrapper.find('.geo-strategy-table tbody .geo-gap-link').text()).toBe(strategyGapBefore)
  wrapper.unmount()
})

