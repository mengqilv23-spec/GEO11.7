import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReportCompetitorBreakdown from './ReportCompetitorBreakdown.vue'
import reportCompetitorBreakdownSource from './ReportCompetitorBreakdown.vue?raw'

describe('report competitor breakdown', () => {
  it('has a report-root dark theme for tables and summaries', () => {
    expect(reportCompetitorBreakdownSource).toContain(`<style>\nhtml[data-theme='dark'] .competitor-breakdown`)
  })

  it('does not render the removed source cooccurrence module', () => {
    const wrapper = mount(ReportCompetitorBreakdown, {
      props: {
        details: {
          ownBrandName: 'APW',
          brands: ['APW', 'Flow'],
          platformMatrix: [],
          personaIntentMatrix: [],
          sourceCooccurrence: Array.from({ length: 11 }, (_, index) => ({
            title: `引用页面 ${index + 1}`,
            domain: 'example.com',
            citations: '1',
            platforms: 'ChatGPT',
            ourMentioned: '否',
            competitors: '—',
            url: `https://example.com/${index + 1}`,
          })),
          narratives: { gapPlatform: '', gapPersonaIntent: '', gapSource: '' },
        },
      },
    })

    expect(wrapper.find('.source-cooccurrence-scroll').exists()).toBe(false)
    expect(wrapper.find('.source-brand-table').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('引用来源 × 品牌共现')
    wrapper.unmount()
  })

  it('renders the platform and persona-intent modules without source cooccurrence content', () => {
    const wrapper = mount(ReportCompetitorBreakdown, {
      props: {
        details: {
          ownBrandName: 'APW Waterjet',
          brands: ['APW Waterjet', 'Flow'],
          platformMatrix: [{
            dimension: 'ChatGPT',
            values: {
              'APW Waterjet': { value: '65%', numerator: 13, denominator: 20 },
              'Flow': { value: '50%', numerator: 10, denominator: 20 },
            },
          }],
          personaIntentMatrix: [{
            dimension: '采购经理 × 设备决策',
            values: {
              'APW Waterjet': { value: '80%', numerator: 8, denominator: 10 },
              'Flow': { value: '60%', numerator: 6, denominator: 10 },
            },
          }],
          sourceCooccurrence: [{
            title: '对比页面',
            domain: 'example.com',
            citations: '3',
            platforms: 'ChatGPT / Gemini',
            ourMentioned: '是',
            competitors: 'Flow, OMAX',
            url: 'https://example.com/compare',
          }],
          narratives: {
            gapPlatform: '平台差异总结',
            gapPersonaIntent: '人设意图总结',
            gapSource: '来源共现总结',
          },
        },
      },
    })

    expect(wrapper.get('.competitor-breakdown-title').text()).toBe('差距拆解：本品与竞品同维对照')
    expect(wrapper.get('.platform-brand-table').text()).toContain('13/20 · 65%')
    expect(wrapper.get('.persona-intent-brand-table').text()).toContain('80%')
    expect(wrapper.find('.source-brand-table').exists()).toBe(false)
    expect(wrapper.text()).toContain('平台差异总结')
    expect(wrapper.text()).toContain('人设意图总结')
    expect(wrapper.text()).not.toContain('来源共现总结')
    expect(wrapper.text()).toContain('APW Waterjet')
  })
})

