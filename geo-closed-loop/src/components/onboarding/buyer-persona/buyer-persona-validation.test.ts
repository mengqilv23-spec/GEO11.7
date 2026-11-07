import type { BuyerPersonaDraft } from './buyer-persona-validation'
import { describe, expect, it } from 'vitest'
import { validateBuyerPersonas } from './buyer-persona-validation'

function persona(overrides: Partial<BuyerPersonaDraft> = {}): BuyerPersonaDraft {
  return {
    id: 'persona-1',
    type: 'aviation-procurement',
    purchaseStage: 'solution-search',
    actualRole: '',
    industry: '',
    companySize: '',
    decisionRole: '',
    purchaseTrigger: '',
    purchaseBudget: '',
    purchaseCycle: '',
    discoveryChannel: '',
    ...overrides,
  }
}

describe('validateBuyerPersonas', () => {
  it('accepts buyer personas with their required type and purchase stage', () => {
    expect(validateBuyerPersonas([persona()])).toEqual({})
  })

  it('requires a type and purchase stage for each persona', () => {
    expect(validateBuyerPersonas([persona({ type: '', purchaseStage: '' })])).toEqual({
      'persona-1.type': '请选择人设类型',
      'persona-1.purchaseStage': '请选择采购阶段',
    })
  })

  it('rejects duplicate persona types while allowing distinct types', () => {
    const result = validateBuyerPersonas([
      persona(),
      persona({ id: 'persona-2', type: 'aviation-procurement' }),
      persona({ id: 'persona-3', type: 'composites-engineering' }),
    ])
    expect(result).toEqual({ 'persona-2.type': '该人设类型已添加' })
  })

  it('rejects more than six personas', () => {
    const personas = Array.from({ length: 7 }, (_, index) => persona({ id: `persona-${index + 1}` }))
    expect(validateBuyerPersonas(personas)).toEqual({ form: '最多维护 6 套买家人设' })
  })
})

