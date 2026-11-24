import type { ProductionQuestion } from '../data/content-production-data'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'geo-content-production:v1'

function withoutRoundAnswers(question: ProductionQuestion): Omit<ProductionQuestion, 'roundAnswers'> {
  return {
    id: question.id,
    question: question.question,
    intent: question.intent,
    state: question.state,
    answers: question.answers,
    citationCount: question.citationCount,
    primaryCitationCount: question.primaryCitationCount,
    confirmed: question.confirmed,
  }
}

describe('content production store storage migration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.resetModules()
  })

  it('restores one detection round and one question per legacy article', async () => {
    const { createSeedProductionItems } = await import('../data/content-production-data')
    const legacyItems = createSeedProductionItems().map(item => ({
      ...item,
      questions: item.questions.flatMap(question => [
        withoutRoundAnswers(question),
        { ...withoutRoundAnswers(question), id: `${question.id}-legacy-2` },
        { ...withoutRoundAnswers(question), id: `${question.id}-legacy-3` },
      ]),
    }))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: legacyItems }))
    vi.resetModules()

    const { useContentProductionStore } = await import('./content-production')
    const items = useContentProductionStore().state.items
    const verified = items.filter(item => item.stage === 'verified')
    const publishedPending = items.find(item => item.id === 'CV-2602')!

    expect(verified).toHaveLength(6)
    expect(verified.every(item => item.questions.length === 1)).toBe(true)
    expect(verified.filter(item => item.roundId === 'r1').map(item => item.taskId)).toEqual(['T-2404', 'T-2405', 'T-2406'])
    expect(verified.filter(item => item.roundId === 'r2').map(item => item.taskId)).toEqual(['T-2407', 'T-2408', 'T-2409'])
    expect(publishedPending.questions).toHaveLength(0)
    expect(publishedPending.questionCandidates).toHaveLength(5)
  })

  it('migrates the removed customer handoff stages into the single-account flow', async () => {
    const { createSeedProductionItems } = await import('../data/content-production-data')
    const seed = createSeedProductionItems()
    const pending = seed.find(item => item.id === 'CV-2601')!
    const legacyItems = [
      { ...pending, stage: 'pending_client', clientConfirmation: { status: 'pending' } },
      {
        ...pending,
        id: 'CV-2599',
        slug: 'legacy-rejected',
        stage: 'client_rejected',
        clientConfirmation: { status: 'rejected', at: new Date().toISOString(), comment: '请补充服务范围。' },
      },
    ]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: legacyItems }))
    vi.resetModules()

    const { useContentProductionStore } = await import('./content-production')
    const items = useContentProductionStore().state.items
    const migratedPending = items.find(item => item.id === 'CV-2601')!
    const migratedRejected = items.find(item => item.id === 'CV-2599')!

    expect(migratedPending.stage).toBe('ai_checked')
    expect(migratedPending.clientConfirmation).toBeUndefined()
    expect(migratedRejected.stage).toBe('draft')
    expect(migratedRejected.clientConfirmation).toBeUndefined()
  })

  it('adds a detection round that is missing from persisted data', async () => {
    const { createPublishedVerificationItems } = await import('../data/content-production-data')
    const firstRound = createPublishedVerificationItems().filter(item => item.roundId === 'r1')
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: firstRound }))
    vi.resetModules()

    const { useContentProductionStore } = await import('./content-production')
    const verified = useContentProductionStore().state.items.filter(item => item.stage === 'verified')

    expect(verified.filter(item => item.roundId === 'r1').map(item => item.taskId)).toEqual(['T-2404', 'T-2405', 'T-2406'])
    expect(verified.filter(item => item.roundId === 'r2').map(item => item.taskId)).toEqual(['T-2407', 'T-2408', 'T-2409'])
  })
})
