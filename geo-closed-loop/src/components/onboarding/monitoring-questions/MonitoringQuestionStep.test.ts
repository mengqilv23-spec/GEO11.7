import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DataList from '../../ui/ce/data-list/DataList.vue'
import MonitoringQuestionStep from './MonitoringQuestionStep.vue'

const props = {
  currentStep: 2,
  steps: ['市场与语言', '买家人设', '监测问题', '采集计划'],
  market: '法国',
  language: '法语',
  selectedIds: [],
  customQuestions: [],
}

describe('monitoringQuestionStep market setup copy', () => {
  it('uses market-scoped copy only when configuring an additional market', async () => {
    const onboarding = mount(MonitoringQuestionStep, {
      props: {
        ...props,
        candidateQuestions: [{ id: 'Q01', question: '测试问题', keyword: '测试关键词', type: '品牌词', persona: '老板', purchaseStage: '需求发现', intent: '认知' }],
      },
    })
    expect(onboarding.get('h1').text()).toBe('确认首次监测问题')
    expect(onboarding.text()).toContain('添加监测问题')
    expect(onboarding.text()).not.toContain('重新读取')
    expect(onboarding.find('.monitoring-question-panel__header-actions svg.lucide-plus').exists()).toBe(true)
    expect(onboarding.find('.monitoring-question-panel__header-actions').text()).not.toContain('编辑')
    expect(onboarding.findAll('.data-list tbody button').map(button => button.text())).toEqual(['编辑', '移除'])

    const marketSetup = mount(MonitoringQuestionStep, { props: { ...props, marketSetup: true } })
    expect(marketSetup.get('h1').text()).toBe('配置该市场监测问题')
    expect(marketSetup.text()).toContain('当前配置市场：法国 · 法语')
    expect(marketSetup.text()).toContain('不同市场的问题配置分别保存')
  })

  it('uses the CE DataList table and gives the question column the remaining width', () => {
    const wrapper = mount(MonitoringQuestionStep, { props })

    expect(wrapper.findComponent(DataList).exists()).toBe(true)
    expect(wrapper.get('col:nth-child(1)').attributes('style')).toContain('width: 64px')
    expect(wrapper.get('th:nth-child(2)').attributes('style')).toContain('width: auto')
    expect(wrapper.get('th:nth-child(3)').attributes('style')).toContain('min-width: 230px')
    expect(wrapper.get('th:nth-child(3)').classes()).toContain('monitoring-question-table__wrap')
    expect(wrapper.get('th:nth-child(4)').classes()).toContain('monitoring-question-table__nowrap')
  })

  it('renders a saved custom question only once when both sources contain its ID', () => {
    const question = {
      id: 'custom-1',
      question: 'Wie funktioniert CFRP-Schneiden?',
      keyword: 'CFRP-Schneiden',
      type: 'Produktwort',
      persona: 'Technischer Leiter',
      purchaseStage: 'Evaluierung',
      intent: 'Information',
      mainConcern: 'Präzision',
    }
    const wrapper = mount(MonitoringQuestionStep, {
      props: {
        ...props,
        candidateQuestions: [question],
        customQuestions: [question],
      },
    })

    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.text().match(/Wie funktioniert CFRP-Schneiden\?/g)).toHaveLength(1)
  })

  it('removes a question from the list and clears its selection', async () => {
    const wrapper = mount(MonitoringQuestionStep, {
      props: {
        ...props,
        selectedIds: ['Q01'],
        candidateQuestions: [{ id: 'Q01', question: '测试问题', keyword: '测试关键词', type: '品牌词', persona: '老板', purchaseStage: '需求发现', intent: '认知' }],
      },
    })
    await wrapper.get('.monitoring-question-panel__row-actions button:last-child').trigger('click')
    expect(wrapper.text()).not.toContain('测试问题')
    expect(wrapper.emitted('selectionChanged')?.[0]).toEqual([[]])
  })

  it('fills a missing keyword in candidate data', () => {
    const wrapper = mount(MonitoringQuestionStep, {
      props: {
        ...props,
        candidateQuestions: [{
          id: 'Q01',
          question: 'Welches 5-Achs-Wasserstrahlsystem eignet sich für CFRP ohne Delamination?',
          keyword: '碳纤维 / 复材切割',
          type: '品牌词',
          persona: '技术负责人',
          purchaseStage: '需求发现',
          intent: '信息查询',
        }],
      },
    })
    expect(wrapper.text()).toContain('碳纤维 / 复材切割')
  })
})

