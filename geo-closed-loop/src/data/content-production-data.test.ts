import { describe, expect, it } from 'vitest'
import {
  canVerifyContent,
  contentProductionSummary,
  createSeedProductionItems,
  monthlyContentLimitForPlan,
  verificationAvailableAt,
} from './content-production-data'

describe('content production data', () => {
  it('maps plan tiers to the monthly verification article quota', () => {
    expect(monthlyContentLimitForPlan('starter', '入门版')).toBe(10)
    expect(monthlyContentLimitForPlan('pro', '专业版')).toBe(20)
    expect(monthlyContentLimitForPlan('enterprise', '高级版')).toBe(30)
    expect(monthlyContentLimitForPlan('basic', '初级版')).toBe(10)
    expect(monthlyContentLimitForPlan('growth', '中级版')).toBe(20)
  })

  it('opens the verification window 48 hours after publishing', () => {
    const publishedAt = '2026-11-17T08:00:00.000Z'
    const availableAt = verificationAvailableAt(publishedAt)!

    expect(availableAt.toISOString()).toBe('2026-11-19T08:00:00.000Z')
    expect(canVerifyContent({ publishedAt }, new Date('2026-11-19T07:59:59.000Z'))).toBe(false)
    expect(canVerifyContent({ publishedAt }, new Date('2026-11-19T08:00:00.000Z'))).toBe(true)
    expect(canVerifyContent({}, new Date('2026-11-19T08:00:00.000Z'))).toBe(false)
  })

  it('counts only verification articles published in the current month', () => {
    const now = new Date('2026-11-17T08:00:00.000Z')
    const items = createSeedProductionItems(now)
    const summary = contentProductionSummary(items, 20, now)

    expect(summary.published).toBe(7)
    expect(summary.publishedThisMonth).toBe(1)
    expect(summary.pendingQuestions).toBe(1)
    expect(summary.inProgress).toBe(2)
    expect(summary.verified).toBe(6)
    expect(summary.remaining).toBe(19)
    expect(summary.resetLabel).toBe('12-01')
  })
})
