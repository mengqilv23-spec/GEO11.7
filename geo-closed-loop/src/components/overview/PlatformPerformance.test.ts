import type { PlatformMetric } from '../../api/monitoring'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PlatformPerformance from './PlatformPerformance.vue'

const metrics: PlatformMetric[] = [
  { platform: 'chatgpt', modelVersion: null, sampleCount: 12, validAnswerCount: 10, mentionedAnswerCount: 6, mentionRate: 60, mentionVsPrevPp: 5, citedAnswerCount: 2, citationRate: 20 },
  { platform: 'gemini', modelVersion: '2.5', sampleCount: 8, validAnswerCount: 0, mentionedAnswerCount: 0, mentionRate: null, mentionVsPrevPp: null, citedAnswerCount: 0, citationRate: null },
]

describe('platform performance', () => {
  it('renders the API metrics and preserves null rates', () => {
    const wrapper = mount(PlatformPerformance, {
      props: { metrics },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    expect(wrapper.get('[data-platform="chatgpt"]').text()).not.toContain('有效回答')
    expect(wrapper.get('[data-platform="chatgpt"]').text()).not.toContain('12')
    expect(wrapper.get('[data-platform="chatgpt"]').text()).toContain('60%')
    expect(wrapper.get('[data-platform="chatgpt"]').text()).toContain('环比 +5pp')
    expect(wrapper.get('[data-platform="gemini"]').text()).toContain('—')
    expect(wrapper.text()).not.toMatch(/n=\d+ · 本期 \+1pp|演示数据/)
    wrapper.unmount()
  })

  it('shows an empty state when the API returned no platform metrics', () => {
    const wrapper = mount(PlatformPerformance, {
      props: { metrics: [] },
      global: { stubs: { RouterLink: true } },
    })
    expect(wrapper.get('.platform-performance__empty').text()).toContain('暂无可展示的平台指标')
    wrapper.unmount()
  })
})

