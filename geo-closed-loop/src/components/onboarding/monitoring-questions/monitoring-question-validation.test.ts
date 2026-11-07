import { describe, expect, it } from 'vitest'
import { validateCustomMonitoringQuestion } from './monitoring-question-validation'

describe('validateCustomMonitoringQuestion', () => {
  it('requires all fields shown in the custom-question form', () => {
    expect(validateCustomMonitoringQuestion({
      question: '',
      keyword: '',
      type: '',
      persona: '',
      purchaseStage: '',
      intent: '',
      mainConcern: '',
    })).toEqual({
      question: '请输入完整的监测问题',
      keyword: '请输入关键词',
      type: '请选择类型',
      persona: '请选择买家人设',
      purchaseStage: '请选择采购阶段',
      intent: '请选择意图',
      mainConcern: '请选择主要关注问题',
    })
  })

  it('accepts a complete draft and rejects whitespace-only values', () => {
    const validDraft = {
      question: 'APW waterjet: what should buyers compare?',
      keyword: 'APW waterjet',
      type: '品牌词',
      persona: 'aviation-procurement',
      purchaseStage: 'supplier-evaluation',
      intent: 'compare',
      mainConcern: 'technical-performance',
    }

    expect(validateCustomMonitoringQuestion(validDraft)).toEqual({})
    expect(validateCustomMonitoringQuestion({ ...validDraft, keyword: '  ' })).toEqual({ keyword: '请输入关键词' })
  })
})

