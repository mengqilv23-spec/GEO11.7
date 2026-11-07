import type { RoundDetail } from '../../../api/monitoring'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SamplingTrustSection from './SamplingTrustSection.vue'

const round: RoundDetail = {
  id: 8,
  roundNo: 2,
  triggerType: 1,
  roundStatus: 3,
  monitorDate: '2026-10-15',
  totalSample: 240,
  startedAt: null,
  customerId: 1,
  siteId: 2,
  marketId: 3,
  confidenceLevel: 'trend',
  measurementTier: 'trend',
  finishedSampleCount: 240,
  validSample: 228,
  judgedCount: 220,
  pendingJudgeCount: 8,
  validReturnRate: 95,
  dualSourceRate: 90,
  manualReviewRate: 88,
  manualReviewCount: 3,
  repeatablePp: 3.1,
  ciValue: 3.1,
  finishedAt: null,
}

describe('sampling trust section', () => {
  it('shows a service-backed confidence summary instead of the supporting counts and interval', () => {
    const wrapper = mount(SamplingTrustSection, {
      props: {
        schedule: null,
        round,
        cumulative: { executedCount: 720, plannedCount: 800, validCount: 700, roundCount: 3, periodStart: '2026-10-01', periodEnd: '2026-10-15', complete: true },
        questionCount: 10,
        platformCount: 5,
        loading: false,
        error: '',
      },
    })

    expect(wrapper.text()).toContain('趋势级')
    expect(wrapper.text()).toContain('当前问题集累计执行')
    expect(wrapper.text()).toContain('720 次')
    expect(wrapper.text()).toContain('700 条')
    expect(wrapper.text()).toContain('87.5%')
    expect(wrapper.text()).toContain('有效回答率')
    expect(wrapper.text()).toContain('10 个问题 · 5 个平台')
    expect(wrapper.text()).not.toContain('95%')
    expect(wrapper.text()).not.toContain('3.1pp')
    expect(wrapper.findAll('.metric-definition__trigger')).toHaveLength(7)
    expect(wrapper.text()).toContain('测量等级')
    wrapper.unmount()
  })

  it('opens a compact customer-facing explanation for the measurement tier', async () => {
    const wrapper = mount(SamplingTrustSection, {
      props: {
        schedule: null,
        round,
        cumulative: { executedCount: 720, plannedCount: 800, validCount: 700, roundCount: 3, periodStart: '2026-10-01', periodEnd: '2026-10-15', complete: true },
        questionCount: 10,
        platformCount: 5,
        loading: false,
        error: '',
      },
      attachTo: document.body,
    })

    await wrapper.findAll('.metric-definition__trigger')[6].trigger('click')
    expect(document.body.textContent).toContain('不代表 IAB 对本产品或数据出具认证')
    expect(document.body.textContent).toContain('采集频率')
    wrapper.unmount()
  })

  it('hides the formula section when a field has no calculation formula', async () => {
    const wrapper = mount(SamplingTrustSection, {
      props: {
        schedule: null,
        round,
        cumulative: { executedCount: 720, plannedCount: 800, validCount: 700, roundCount: 3, periodStart: '2026-10-01', periodEnd: '2026-10-15', complete: true },
        questionCount: 10,
        platformCount: 5,
        loading: false,
        error: '',
      },
      attachTo: document.body,
    })

    await wrapper.findAll('.metric-definition__trigger')[2].trigger('click')
    expect(document.body.textContent).not.toContain('计算公式')
    wrapper.unmount()
  })
})

