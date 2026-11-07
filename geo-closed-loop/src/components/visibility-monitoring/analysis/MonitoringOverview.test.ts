import type { RoundDetail, RoundSummary } from '../../../api/monitoring'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MonitoringOverview from './MonitoringOverview.vue'

const round: RoundSummary = {
  id: 5,
  roundNo: 3,
  triggerType: 1,
  roundStatus: 2,
  monitorDate: '2026-10-15',
  totalSample: 48,
  startedAt: '2026-10-15 08:00:00',
}

const detail: RoundDetail = {
  ...round,
  customerId: 1,
  siteId: 2,
  marketId: 3,
  confidenceLevel: 'high',
  finishedSampleCount: 48,
  validSample: 46,
  judgedCount: 44,
  pendingJudgeCount: 2,
  validReturnRate: 95.83,
  dualSourceRate: null,
  manualReviewRate: null,
  manualReviewCount: 0,
  repeatablePp: null,
  ciValue: null,
  finishedAt: '2026-10-15 08:30:00',
}

describe('monitoringOverview server data', () => {
  it('renders a service-provided confidence grade without exposing sample support values', () => {
    const wrapper = mount(MonitoringOverview, { props: { round, detail } })

    expect(wrapper.text()).toContain('2026-10-15')
    expect(wrapper.text()).toContain('可信度高')
    expect(wrapper.text()).not.toContain('服务端暂未返回可信度等级')
    expect(wrapper.text()).not.toContain('计划采样')
    expect(wrapper.text()).not.toContain('有效样本')
    expect(wrapper.text()).not.toContain('置信区间')
    expect(wrapper.text()).not.toContain('2026-09-18')
    expect(wrapper.text()).not.toContain('10,050')
  })

  it('shows an honest empty state when there is no round', () => {
    const wrapper = mount(MonitoringOverview, { props: { round: null, detail: null, statusText: '未配置' } })

    expect(wrapper.text()).toContain('未配置')
    expect(wrapper.text()).not.toContain('暂无监测轮次数据')
    expect(wrapper.find('.vm-round-summary__metrics').exists()).toBe(false)
  })

  it('derives the displayed trend grade from the confidence interval', () => {
    const wrapper = mount(MonitoringOverview, {
      props: { round, detail: { ...detail, confidenceLevel: '95%', ciValue: 2.8 }, variant: 'overview', showRoundNumber: false },
    })

    expect(wrapper.get('.vm-round-summary__confidence dd').text()).toBe('中 · 趋势级')
    expect(wrapper.get('.vm-round-summary__confidence dd').attributes('title')).toContain('±2.8pp')
  })

  it('leaves server fields blank when their values are missing', () => {
    const wrapper = mount(MonitoringOverview, {
      props: {
        round,
        detail: { ...detail, confidenceLevel: null },
        additionalMetrics: [{ label: '市场 / 语言', value: null }],
        variant: 'overview',
        showRoundNumber: false,
      },
    })

    expect(wrapper.get('.vm-round-summary__confidence dd').text()).toBe('')
    expect(wrapper.findAll('.vm-round-summary__metrics dd').map(item => item.text())).not.toContain('—')
  })

  it('shows the matching action and status, then emits when toggled', async () => {
    const wrapper = mount(MonitoringOverview, { props: { round, detail, monitoringEnabled: true } })
    expect(wrapper.get('.vm-round-summary__status').text()).toBe('进行中')
    expect(wrapper.get('.vm-round-summary__toggle').text()).toBe('暂停监测')
    expect(wrapper.get('.vm-round-summary__trigger').text()).toBe('立即采集')
    await wrapper.get('.vm-round-summary__toggle').trigger('click')
    expect(wrapper.emitted('toggleMonitoring')).toHaveLength(1)
    await wrapper.get('.vm-round-summary__trigger').trigger('click')
    expect(wrapper.emitted('triggerRound')).toHaveLength(1)

    await wrapper.setProps({ monitoringEnabled: false })
    expect(wrapper.get('.vm-round-summary__status').text()).toBe('已暂停')
    expect(wrapper.get('.vm-round-summary__toggle').text()).toBe('开启监测')
  })

  it('can omit immediate collection while retaining the monitoring overview controls', () => {
    const wrapper = mount(MonitoringOverview, { props: { round, detail, showTrigger: false } })

    expect(wrapper.find('.vm-round-summary__toggle').exists()).toBe(true)
    expect(wrapper.find('.vm-round-summary__trigger').exists()).toBe(false)
  })

  it('shows only the action for the current monitoring state when actions are exclusive', async () => {
    const wrapper = mount(MonitoringOverview, {
      props: { round, detail, monitoringEnabled: true, exclusiveActions: true },
    })

    expect(wrapper.get('.vm-round-summary__toggle').text()).toBe('暂停监测')
    expect(wrapper.find('.vm-round-summary__trigger').exists()).toBe(false)

    await wrapper.setProps({ monitoringEnabled: false })
    expect(wrapper.find('.vm-round-summary__toggle').exists()).toBe(false)
    expect(wrapper.get('.vm-round-summary__trigger').text()).toBe('立即采集')
  })
})

