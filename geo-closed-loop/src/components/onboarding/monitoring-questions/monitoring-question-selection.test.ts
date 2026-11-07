import { describe, expect, it } from 'vitest'
import { canSelectMonitoringQuestion, limitSelectedQuestionIds } from './monitoring-question-selection'

describe('monitoring question selection', () => {
  it('allows already selected rows to be deselected at the limit', () => {
    const selected = ['q1', 'q2', 'q3', 'q4', 'q5']

    expect(canSelectMonitoringQuestion('q1', selected)).toBe(true)
    expect(canSelectMonitoringQuestion('q6', selected)).toBe(false)
  })

  it('keeps bulk selection within the five-question plan limit', () => {
    expect(limitSelectedQuestionIds(
      ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
      ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
    )).toEqual(['q1', 'q2', 'q3', 'q4', 'q5'])
  })

  it('preserves existing selected rows before newly requested rows', () => {
    expect(limitSelectedQuestionIds(
      ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
      ['q3', 'q4'],
    )).toEqual(['q3', 'q4', 'q1', 'q2', 'q5'])
  })
})

