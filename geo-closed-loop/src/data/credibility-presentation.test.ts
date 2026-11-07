import { describe, expect, it } from 'vitest'
import { presentCredibility, presentCredibilityFromInterval } from './credibility-presentation'

describe('presentCredibility', () => {
  it('maps service-provided high, medium, and low grades to user copy', () => {
    expect(presentCredibility('high').label).toBe('可信度高')
    expect(presentCredibility('medium').label).toBe('可信度中')
    expect(presentCredibility('low').label).toBe('可信度低')
  })

  it('does not mistake a trend-level classification for a high/medium/low grade', () => {
    expect(presentCredibility('trend')).toEqual({
      label: '可信度待评估',
      reason: '服务端当前返回趋势级口径，未提供高、中、低可信度评级。',
    })
  })

  it('keeps missing service grades empty', () => {
    expect(presentCredibility(null)).toEqual({
      label: '',
      reason: '',
    })
  })

  it('derives a trend grade from the 95% confidence-interval margin', () => {
    expect(presentCredibilityFromInterval(2.8).label).toBe('中 · 趋势级')
    expect(presentCredibilityFromInterval(2.8).reason).toContain('±2.8pp')
    expect(presentCredibilityFromInterval(1.7).label).toBe('高 · 趋势级')
    expect(presentCredibilityFromInterval(6.1).label).toBe('低 · 趋势级')
    expect(presentCredibilityFromInterval(null).label).toBe('')
  })
})

