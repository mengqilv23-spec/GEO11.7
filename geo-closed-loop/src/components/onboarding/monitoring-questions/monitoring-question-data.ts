export interface MonitoringQuestion {
  id: string
  question: string
  keyword: string
  type: string
  persona: string
  purchaseStage: string
  intent: string
  mainConcern?: string
  personaId?: number
  questionTypeCode?: string
  purchaseStageCode?: string
  intentCode?: string
  focusCode?: string
}

export function inferMonitoringKeyword(question: string): string {
  if (/CFRP|Kohlefaser|Faserverbund|Verbundwerkstoff/i.test(question))
    return '碳纤维 / 复材切割'
  if (/Titan/i.test(question))
    return '钛合金航空加工'
  if (/Laser/i.test(question))
    return '水刀 vs 激光'
  if (/5-Achs|Geometrien/i.test(question))
    return '五轴水刀选型'
  if (/60[.,]000\s*PSI|Pumpen/i.test(question))
    return '高压水刀泵'
  if (/kostet|Kosten/i.test(question))
    return 'CFRP 切割成本'
  if (/Anbieter|empfehlen/i.test(question))
    return '水刀设备供应商'
  return '水刀切割方案'
}

