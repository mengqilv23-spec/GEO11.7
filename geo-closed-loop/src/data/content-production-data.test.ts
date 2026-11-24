import { describe, expect, it } from 'vitest'
import {
  canVerifyContent,
  contentProductionSummary,
  contentStageGroupLabel,
  createSeedProductionItems,
  monthlyContentLimitForPlan,
  runAiCheckFor,
  stageLabel,
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

  it('checks only brand wording and claim boundaries', () => {
    const brief = { theme: '钛合金切割', targetQuestion: '', audience: '', market: '', notes: '' }
    const failed = runAiCheckFor({ title: '钛合金切割', body: '<p>钛合金切割支持。</p>', keyFacts: [], brief })
    expect(failed.items.map(item => item.label)).toEqual(['品牌口径', '承诺边界'])
    expect(failed.passed).toBe(false)

    const passed = runAiCheckFor({ title: 'APW 钛合金切割', body: '<p>APW Waterjet 提供钛合金切割支持。</p>', keyFacts: [], brief })
    expect(passed.items.map(item => item.label)).toEqual(['品牌口径', '承诺边界'])
    expect(passed.passed).toBe(true)
  })

  it('uses confirmation as a single-account step instead of a customer handoff', () => {
    expect(stageLabel('ai_checked')).toBe('待确认')
    expect(stageLabel('ready_to_publish')).toBe('待发布')
    expect(contentStageGroupLabel('draft')).toBe('进行中')
    expect(contentStageGroupLabel('ai_checked')).toBe('待确认')
    expect(contentStageGroupLabel('ready_to_publish')).toBe('进行中')
    expect(contentStageGroupLabel('questions_pending')).toBe('待核验')
    expect(contentStageGroupLabel('verified')).toBe('已核验')
  })

  it('counts published, remaining, and verified content against the total allowance', () => {
    const items = createSeedProductionItems(new Date('2026-11-17T08:00:00.000Z'))
    const summary = contentProductionSummary(items, 20)

    expect(summary.published).toBe(7)
    expect(summary.pendingQuestions).toBe(1)
    expect(summary.inProgress).toBe(2)
    expect(summary.verified).toBe(6)
    expect(summary.remaining).toBe(13)
    expect(summary.exhausted).toBe(false)
    expect(contentProductionSummary(items, 7).remaining).toBe(0)
    expect(contentProductionSummary(items, 7).exhausted).toBe(true)
  })
})
