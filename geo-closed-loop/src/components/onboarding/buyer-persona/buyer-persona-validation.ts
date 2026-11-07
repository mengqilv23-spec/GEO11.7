export interface BuyerPersonaDraft {
  id: string
  type: string
  purchaseStage: string
  commonQuestions?: string
  actualRole: string
  industry: string
  companySize: string
  decisionRole: string
  purchaseTrigger: string
  purchaseBudget: string
  purchaseCycle: string
  discoveryChannel: string
}

export type BuyerPersonaErrors = Record<string, string>

export function validateBuyerPersonas(personas: readonly BuyerPersonaDraft[]): BuyerPersonaErrors {
  if (personas.length > 6)
    return { form: '最多维护 6 套买家人设' }

  const errors: BuyerPersonaErrors = {}
  const seenTypes = new Set<string>()
  for (const persona of personas) {
    if (!persona.type.trim()) {
      errors[`${persona.id}.type`] = '请选择人设类型'
    }
    else if (seenTypes.has(persona.type)) {
      errors[`${persona.id}.type`] = '该人设类型已添加'
    }
    else {
      seenTypes.add(persona.type)
    }

    if (!persona.purchaseStage.trim())
      errors[`${persona.id}.purchaseStage`] = '请选择采购阶段'
  }
  return errors
}

