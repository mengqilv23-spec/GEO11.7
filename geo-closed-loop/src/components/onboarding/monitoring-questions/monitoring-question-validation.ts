export interface CustomMonitoringQuestionDraft {
  question: string
  keyword: string
  type: string
  persona: string
  purchaseStage: string
  intent: string
  mainConcern: string
}

export type CustomMonitoringQuestionErrors = Partial<Record<keyof CustomMonitoringQuestionDraft, string>>

const requiredFieldMessages: Record<keyof CustomMonitoringQuestionDraft, string> = {
  question: '请输入完整的监测问题',
  keyword: '请输入关键词',
  type: '请选择类型',
  persona: '请选择买家人设',
  purchaseStage: '请选择采购阶段',
  intent: '请选择意图',
  mainConcern: '请选择主要关注问题',
}

export function validateCustomMonitoringQuestion(
  draft: CustomMonitoringQuestionDraft,
): CustomMonitoringQuestionErrors {
  const errors: CustomMonitoringQuestionErrors = {}
  for (const [field, message] of Object.entries(requiredFieldMessages) as [keyof CustomMonitoringQuestionDraft, string][]) {
    if (!draft[field].trim())
      errors[field] = message
  }
  return errors
}

