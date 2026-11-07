import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BuyerPersonaEditorDialog from './BuyerPersonaEditorDialog.vue'
import BuyerPersonaStep from './BuyerPersonaStep.vue'

const props = {
  currentStep: 1,
  steps: ['市场与语言', '买家人设', '监测问题', '采集计划'],
  personas: [],
  market: '法国',
}

describe('buyerPersonaStep market setup copy', () => {
  it('uses market-specific copy without changing the default onboarding copy', () => {
    const onboarding = mount(BuyerPersonaStep, { props })
    expect(onboarding.get('h1').text()).toBe('维护首次监测买家人设')

    const marketSetup = mount(BuyerPersonaStep, { props: { ...props, marketSetup: true } })
    expect(marketSetup.get('h1').text()).toBe('维护该市场的买家人设')
    expect(marketSetup.text()).toContain('当前配置市场：法国')
    expect(marketSetup.text()).toContain('还没有添加该市场的买家人设')
  })

  it('shows a delete action with an outlined danger tone', () => {
    const wrapper = mount(BuyerPersonaStep, {
      props: {
        ...props,
        personas: [{
          id: 'persona-1',
          type: 'aviation-procurement',
          purchaseStage: 'solution_search',
          actualRole: '',
          industry: '',
          companySize: '',
          decisionRole: '',
          purchaseTrigger: '',
          purchaseBudget: '',
          purchaseCycle: '',
          discoveryChannel: '',
        }],
      },
    })
    const removeButton = wrapper.get('[aria-label="删除航空采购"]')

    expect(removeButton.text()).toBe('删除')
    expect(removeButton.attributes('data-variant')).toBe('outline')
    expect(removeButton.attributes('data-tone')).toBe('danger')
  })

  it('closes the editor when the saved event updates the parent persona list', async () => {
    const wrapper = mount(BuyerPersonaStep, { props })
    await wrapper.get('.buyer-persona-step__empty button').trigger('click')
    const editor = wrapper.findComponent(BuyerPersonaEditorDialog)
    expect(editor.props('open')).toBe(true)

    editor.vm.$emit('saved', [])
    await wrapper.vm.$nextTick()

    expect(editor.props('open')).toBe(false)
  })

  it('shows the updated AI-generated defaults guidance', () => {
    const wrapper = mount(BuyerPersonaStep, { props })
    expect(wrapper.text()).toContain('AI 已根据当前品牌、产品与市场生成默认值；用户仅需确认或修改买家信息与采购信息。')
  })

  it('summarizes optional persona fields instead of showing every field', () => {
    const completePersona = {
      id: 'persona-1',
      type: 'aviation-procurement',
      purchaseStage: 'solution-search',
      actualRole: '采购经理',
      industry: '航空制造',
      companySize: '1000-plus',
      decisionRole: 'procurement',
      purchaseTrigger: '设备更新',
      purchaseBudget: '100万',
      purchaseCycle: '3个月',
      discoveryChannel: '行业展会',
    }
    const emptyPersona = {
      ...completePersona,
      id: 'persona-2',
      actualRole: '',
      industry: '',
      companySize: '',
      decisionRole: '',
      purchaseTrigger: '',
      purchaseBudget: '',
      purchaseCycle: '',
      discoveryChannel: '',
    }
    const wrapper = mount(BuyerPersonaStep, { props: { ...props, personas: [completePersona, emptyPersona] } })

    expect(wrapper.text()).toContain('采购阶段：方案寻找')
    expect(wrapper.text()).toContain('已补充 8 项选填信息')
    expect(wrapper.text()).toContain('未填写选填信息')
    expect(wrapper.text()).not.toContain('采购经理')
  })
})

