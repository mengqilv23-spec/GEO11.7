import type { DropdownSelectOption } from '../../ui/ce'

// Temporary local data. Replace these arrays with the onboarding options API response.
export const buyerPersonaTypeOptions: DropdownSelectOption[] = [
  { value: 'composites-engineering', label: '复材技术负责人' },
  { value: 'aviation-procurement', label: '航空采购' },
  { value: 'japan-trading-company', label: '日本商社' },
  { value: 'workshop-supervisor', label: '车间主管' },
  { value: 'composites-startup', label: '复材初创' },
  { value: 'automotive-tier-one', label: '汽车 Tier-1' },
]

export const purchaseStageOptions: DropdownSelectOption[] = [
  { value: 'requirement-identification', label: '需求识别' },
  { value: 'solution-search', label: '方案寻找' },
  { value: 'supplier-evaluation', label: '供应商评估' },
  { value: 'purchase-decision', label: '采购决策' },
]

export const companySizeOptions: DropdownSelectOption[] = [
  { value: '0-999', label: '0–999 人' },
  { value: '1000-4999', label: '1,000–4,999 人' },
  { value: '5000-9999', label: '5,000–9,999 人' },
  { value: '10000-plus', label: '10,000 人以上' },
]

export const maxBuyerPersonas = 6

