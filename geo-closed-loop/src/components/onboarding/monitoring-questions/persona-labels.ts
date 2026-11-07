import type { DropdownSelectOption } from '../../ui/ce/dropdown-select/types'

const personaLabels: Record<string, string> = {
  procurement_lead: '采购负责人',
  company_boss: '企业老板',
}

export function localizePersonaOption(option: DropdownSelectOption): DropdownSelectOption {
  const byValue = personaLabels[option.value.trim().toLocaleLowerCase()]
  const byLabel = personaLabels[option.label.trim().toLocaleLowerCase()]
  return { ...option, label: byValue ?? byLabel ?? option.label }
}

