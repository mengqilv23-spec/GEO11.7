import type { KnowledgeItem } from '../../../../types'
import type { BrandKnowledgeUpdateSnapshot, MarketRecommendationState } from './types'
import { describe, expect, it } from 'vitest'
import { visibilityMonitoringData } from '../../../../data/visibility-monitoring-data'
import { createMockBrandKnowledgeUpdateService } from './mock-service'

const knowledgeItems: KnowledgeItem[] = [{ id: 'brand', index: '01', title: '品牌信息', summary: '更新品牌定位', requirements: '保持品牌信息准确' }]

function market(overrides: Partial<MarketRecommendationState> = {}): MarketRecommendationState {
  return {
    id: 'de-de',
    name: '德国 · 德语',
    language: '德语',
    enabled: true,
    processed: false,
    candidates: visibilityMonitoringData.questions.slice(0, 6).map(question => ({ ...question, id: `candidate-${question.id}` })),
    selectedCandidateIds: [],
    existingQuestions: [visibilityMonitoringData.questions[0]!],
    ...overrides,
  }
}

function snapshot(overrides: Partial<BrandKnowledgeUpdateSnapshot> = {}): BrandKnowledgeUpdateSnapshot {
  return {
    demo: true,
    editQuota: { total: 3, remaining: 2 },
    knowledgeItems: [],
    markets: [market()],
    ...overrides,
  }
}

describe('brand knowledge update mock service', () => {
  it('previews impact without mutating the workflow snapshot', async () => {
    const service = createMockBrandKnowledgeUpdateService()
    const before = await service.getSnapshot()

    const impact = await service.previewChange(knowledgeItems)
    const after = await service.getSnapshot()

    expect(impact.activeMarketCount).toBeGreaterThan(0)
    expect(impact.editCost).toBe(1)
    expect(impact.remainingEdits).toBe(before.editQuota.remaining - 1)
    expect(after).toEqual(before)
  })

  it('pauses enabled markets and generates candidate questions only after confirmation', async () => {
    const service = createMockBrandKnowledgeUpdateService()

    const result = await service.confirmChange(knowledgeItems)

    expect(result.markets.filter(item => item.enabled)).toHaveLength(0)
    expect(result.markets.every(item => item.candidates.length > 0)).toBe(true)
    expect(result.editQuota.remaining).toBe(1)
    expect(result.knowledgeItems).toEqual(knowledgeItems)
  })

  it('adds only selected candidates, retains existing questions and ignores duplicate selections', async () => {
    const service = createMockBrandKnowledgeUpdateService(snapshot())
    const initial = await service.getSnapshot()
    const selected = initial.markets[0]!.candidates[0]!.id

    const result = await service.saveMarketSelection('de-de', [selected, selected])
    const saved = result.markets[0]!

    expect(saved.existingQuestions).toHaveLength(2)
    expect(saved.existingQuestions[0]!.id).toBe(visibilityMonitoringData.questions[0]!.id)
    expect(saved.existingQuestions[1]!.id).toBe(selected)
    expect(saved.selectedCandidateIds).toEqual([selected])
    expect(saved.processed).toBe(true)
  })

  it('enables every market and returns the authoritative snapshot', async () => {
    const service = createMockBrandKnowledgeUpdateService(snapshot({ markets: [market(), market({ id: 'us-en', enabled: false })] }))

    const result = await service.enableAllMarkets()

    expect(result.markets.every(item => item.enabled)).toBe(true)
  })

  it('supports zero markets and zero generated candidates', async () => {
    const noMarkets = createMockBrandKnowledgeUpdateService(snapshot({ markets: [] }))
    const noCandidates = createMockBrandKnowledgeUpdateService(snapshot({ markets: [market({ candidates: [] })] }))

    expect((await noMarkets.confirmChange(knowledgeItems)).markets).toEqual([])
    expect((await noCandidates.getSnapshot()).markets[0]!.candidates).toEqual([])
  })

  it('rejects stale candidate ids and selections over the five-question limit without mutation', async () => {
    const service = createMockBrandKnowledgeUpdateService(snapshot())
    const before = await service.getSnapshot()
    const ids = before.markets[0]!.candidates.map(candidate => candidate.id)

    await expect(service.saveMarketSelection('de-de', ['unknown-id'])).rejects.toThrow(/候选/)
    await expect(service.saveMarketSelection('de-de', ids.slice(0, 6))).rejects.toThrow(/5/)
    expect(await service.getSnapshot()).toEqual(before)
  })

  it('rejects confirmation when no edit quota remains', async () => {
    const service = createMockBrandKnowledgeUpdateService(snapshot({ editQuota: { total: 3, remaining: 0 } }))

    await expect(service.confirmChange(knowledgeItems)).rejects.toThrow(/次数/)
  })
})

