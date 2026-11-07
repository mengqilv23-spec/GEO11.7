import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LatestReportCard from './LatestReportCard.vue'

describe('latest report card monitoring scope', () => {
  it('shows market, question count, and platform count as a compact metadata row', () => {
    const wrapper = mount(LatestReportCard, {
      props: {
        report: null,
        remaining: null,
        quotaTotal: 10,
        quotaReady: false,
        canGenerate: false,
      },
    })

    const meta = wrapper.get('[data-testid="monitoring-scope"]')
    expect(meta.text()).toContain('德国 × 德语')
    expect(meta.text()).toContain('20 条问题')
    expect(meta.text()).toContain('6 个 AI 平台')
    expect(meta.findAll('strong, span')).toHaveLength(3)
  })

  it('uses the report scope when the API provides one', () => {
    const wrapper = mount(LatestReportCard, {
      props: {
        report: {
          id: '9001',
          type: 'adhoc',
          title: '次报',
          period: '',
          date: '',
          summary: '',
          tags: [],
          sections: [],
          questionIds: [],
          status: 'generated',
          scopeSummary: '日本/日语',
        },
        remaining: null,
        quotaTotal: 10,
        quotaReady: false,
        canGenerate: false,
      },
    })

    expect(wrapper.get('[data-testid="monitoring-scope"]').text()).toContain('日本 × 日语')
  })

  it('converts API country and language codes to readable Chinese labels', () => {
    const wrapper = mount(LatestReportCard, {
      props: {
        report: {
          id: '9001',
          type: 'adhoc',
          title: '次报',
          period: '',
          date: '',
          summary: '',
          tags: [],
          sections: [],
          questionIds: [],
          status: 'generated',
          scopeSummary: 'de/de',
        },
        remaining: null,
        quotaTotal: 10,
        quotaReady: false,
        canGenerate: false,
      },
    })

    expect(wrapper.get('[data-testid="monitoring-scope"] strong').text()).toBe('德国 × 德语')
  })

  it('shows the available quota state and remaining count from the API value', () => {
    const wrapper = mount(LatestReportCard, {
      props: {
        report: null,
        remaining: 2,
        quotaTotal: 10,
        quotaReady: true,
        canGenerate: true,
      },
    })

    expect(wrapper.get('[data-testid="quota-count"]').text()).toBe('本月剩余 2 次')
    expect(wrapper.find('.quota-status').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('购买单次权益')
    expect(wrapper.text()).not.toContain('升级套餐')
  })

  it('emits the formatted scope and current monitoring counts when generation is requested', async () => {
    const wrapper = mount(LatestReportCard, {
      props: {
        report: null,
        remaining: 2,
        quotaTotal: 10,
        quotaReady: true,
        canGenerate: true,
      },
    })

    await wrapper.get('[data-testid="generate-latest"]').trigger('click')

    expect(wrapper.emitted('generate')).toEqual([[{
      scopeLabel: '德国 × 德语',
      questionCount: 20,
      platformCount: 6,
    }]])
  })

  it('shows exhausted state when the API reports zero remaining quota', () => {
    const wrapper = mount(LatestReportCard, {
      props: {
        report: null,
        remaining: 0,
        quotaTotal: 10,
        quotaReady: true,
        canGenerate: true,
      },
    })

    expect(wrapper.get('[data-testid="quota-count"]').text()).toBe('本月已无剩余次数')
    expect(wrapper.find('.quota-status').exists()).toBe(false)
    expect(wrapper.get('[data-testid="generate-latest"]').attributes('disabled')).toBeDefined()
  })

  it('shows unlimited quota as available instead of exhausted', () => {
    const wrapper = mount(LatestReportCard, {
      props: {
        report: null,
        remaining: null,
        quotaTotal: 0,
        quotaReady: true,
        canGenerate: true,
      },
    })

    expect(wrapper.get('[data-testid="quota-count"]').text()).toBe('本月不限次数')
    expect(wrapper.find('.quota-status').exists()).toBe(false)
  })

  it('does not guess a quota state while the quota is loading', () => {
    const wrapper = mount(LatestReportCard, {
      props: {
        report: null,
        remaining: null,
        quotaTotal: 0,
        quotaReady: false,
        canGenerate: false,
      },
    })

    expect(wrapper.get('[data-testid="quota-count"]').text()).toBe('额度加载中…')
    expect(wrapper.find('.quota-status').exists()).toBe(false)
  })
})

