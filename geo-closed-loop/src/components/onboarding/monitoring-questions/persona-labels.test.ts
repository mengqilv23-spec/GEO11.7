import { describe, expect, it } from 'vitest'
import { localizePersonaOption } from './persona-labels'

describe('localizePersonaOption', () => {
  it('translates English persona codes while preserving their API values', () => {
    expect(localizePersonaOption({ value: 'persona-1', label: 'procurement_lead' })).toEqual({
      value: 'persona-1',
      label: '采购负责人',
    })
    expect(localizePersonaOption({ value: 'company_boss', label: 'company_boss' })).toEqual({
      value: 'company_boss',
      label: '企业老板',
    })
  })
})

