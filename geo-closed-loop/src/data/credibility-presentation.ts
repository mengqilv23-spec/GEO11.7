export interface CredibilityPresentation {
  label: string
  reason: string
}

const gradeLabels: Record<string, string> = {
  high: '可信度高',
  medium: '可信度中',
  moderate: '可信度中',
  low: '可信度低',
  高: '可信度高',
  中: '可信度中',
  低: '可信度低',
}

export function presentCredibility(level: string | null | undefined): CredibilityPresentation {
  const normalized = level?.trim().toLowerCase() ?? ''
  const label = gradeLabels[normalized]
  if (label) {
    return {
      label,
      reason: '可信度等级由服务端综合评估样本质量与监测稳定性后返回。',
    }
  }

  if (normalized === 'trend' || normalized === 'trend-level' || normalized === 'trend_level') {
    return {
      label: '可信度待评估',
      reason: '服务端当前返回趋势级口径，未提供高、中、低可信度评级。',
    }
  }

  return {
    label: '',
    reason: '',
  }
}

/** Map the 95% confidence-interval margin (pp) to the summary trend grade. */
export function presentCredibilityFromInterval(ciValue: number | null | undefined): CredibilityPresentation {
  if (ciValue === null || ciValue === undefined || !Number.isFinite(ciValue))
    return { label: '', reason: '' }

  const margin = Math.abs(ciValue)
  const grade = margin <= 2 ? '高' : margin <= 5 ? '中' : '低'
  return {
    label: `${grade} · 趋势级`,
    reason: `依据 95% 置信区间 ±${margin.toFixed(1)}pp 判断：±2.0pp 以内为高，±2.0–5.0pp 为中，超过 ±5.0pp 为低。`,
  }
}

