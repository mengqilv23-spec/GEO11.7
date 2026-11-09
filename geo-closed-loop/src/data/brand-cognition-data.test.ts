import { describe, expect, it } from 'vitest'
import { brandCognitionQuestions } from './brand-cognition-data'

describe('brand cognition data', () => {
  it('uses the latest monitoring batch and marks official-domain citations as owned', () => {
    expect(brandCognitionQuestions).toHaveLength(10)
    const first = brandCognitionQuestions.find(question => question.id === 'q1')!
    expect(first.lastChecked).toBe('2026-09-17')
    expect(first.citations).toHaveLength(2)
    expect(first.ownedCount).toBe(1)
    expect(first.thirdPartyCount).toBe(1)
    expect(first.citations.find(citation => citation.isOwned)?.domain).toBe('apw.com')
    expect(first.citations.find(citation => citation.isOwned)?.title).toBe('APW Waterjet · Carbon Fiber Solutions')
    expect(first.citations.find(citation => !citation.isOwned)?.domain).toBe('reddit.com')
  })

  it('flags questions whose latest citations contain no owned content', () => {
    const fourth = brandCognitionQuestions.find(question => question.id === 'q4')!
    expect(fourth.hasOwnedCitation).toBe(false)
    expect(fourth.ownedCount).toBe(0)
    expect(fourth.thirdPartyCount).toBe(2)
    expect(fourth.citations.every(citation => !citation.isOwned)).toBe(true)
  })
})
