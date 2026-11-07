import type { BrandMetric } from '../../api/monitoring'
import type { OverviewTrend } from '../../data/monitoring-api-adapters'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OverviewMetrics from './OverviewMetrics.vue'

const trend: OverviewTrend = {
  weeks: ['2026-10-01', '2026-10-08'],
  series: [{ id: 'soa', label: '品牌提及率（SOA）', color: '#2563eb', values: [35, 42] }],
}
const brandMetric: BrandMetric = {
  brandType: 1,
  brandId: 0,
  brandName: 'APW',
  validAnswerCount: 12,
  mentionedAnswerCount: 6,
  mentionTotalCount: 7,
  mentionRate: 50,
  recommendRate: null,
  citationRate: 25,
  sovRate: 60,
  avgRank: 1.5,
  top1Rate: null,
  top3Rate: null,
  top5Rate: null,
  factAccuracyRate: 90,
  sentimentPositiveCount: 8,
  sentimentNeutralCount: 3,
  sentimentNegativeCount: 1,
}

describe('overview metrics', () => {
  it('renders API metrics and leaves unavailable values blank instead of inventing comparisons', () => {
    const wrapper = mount(OverviewMetrics, { props: { trend, brandMetric } })
    expect(wrapper.get('[data-metric="soa"]').text()).toContain('50%')
    expect(wrapper.get('[data-metric="recommendation"]').text()).toContain('—')
    expect(wrapper.get('[data-metric="soa"]').text()).toContain('较上次监测（pp）')
    expect(wrapper.get('[data-metric="soa"]').text()).toContain('—')
    expect(wrapper.get('[data-testid="average-rank"]').text()).toContain('1.5 位')
    expect(wrapper.get('[data-testid="factual-accuracy"]').text()).toContain('事实准确率 90%')
    expect(wrapper.get('[data-testid="factual-accuracy"]').text()).toContain('正面 8 · 中性 3 · 负面 1')
    expect(wrapper.text()).not.toMatch(/42%|28%|71%|08\/30/)
    wrapper.unmount()
  })

  it('shows a clear empty state when there are no trend points', () => {
    const wrapper = mount(OverviewMetrics, { props: { trend: { weeks: [], series: [] }, brandMetric: null } })
    expect(wrapper.get('.overview-metrics__empty').text()).toContain('暂无可展示的监测趋势')
    expect(wrapper.get('[data-metric="soa"]').text()).toContain('—')
    wrapper.unmount()
  })
})

