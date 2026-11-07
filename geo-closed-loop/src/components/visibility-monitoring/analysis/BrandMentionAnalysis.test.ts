import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { visibilityMonitoringData } from '../../../data/visibility-monitoring-data'
import BrandMentionAnalysis from './BrandMentionAnalysis.vue'

describe('brand mention analysis labels', () => {
  it('uses keyword wording and identifies SOA in the intent heatmap subtitle', () => {
    const wrapper = mount(BrandMentionAnalysis, {
      props: {
        weeks: visibilityMonitoringData.weeks,
        overallSeries: visibilityMonitoringData.overallSeries,
        series: visibilityMonitoringData.trendSeries,
        engineSeries: visibilityMonitoringData.engineSeries,
        personaSeries: visibilityMonitoringData.personaSeries,
        competitors: visibilityMonitoringData.competitors,
        personas: visibilityMonitoringData.personas,
        topics: visibilityMonitoringData.topics,
        intents: visibilityMonitoringData.intents,
        topicCells: visibilityMonitoringData.topicCells,
        intentCells: visibilityMonitoringData.intentCells,
      },
      global: { stubs: { MonitoringEChart: true } },
    })

    expect(wrapper.text()).toContain('买家人设 × 关键词')
    expect(wrapper.text()).not.toContain('核心主题')
    expect(wrapper.text()).toContain('不同采购决策阶段的品牌提及率（SOA）')
  })
})

