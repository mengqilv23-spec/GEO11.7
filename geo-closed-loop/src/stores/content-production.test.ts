import { beforeEach, describe, expect, it } from 'vitest'
import { contentProductionSummary } from '../data/content-production-data'
import { resetContentProductionStore, useContentProductionStore } from './content-production'

const brief = {
  theme: '钛合金航空结构件 · 服务边界说明',
  targetQuestion: 'APW 是否支持钛合金航空结构件切割？',
  audience: '航空部件采购经理',
  market: '德国',
  notes: '具体材料、厚度与服务范围需结合项目确认。',
}
const facts = ['钛合金切割', '航空结构件', '服务边界确认']

describe('content production store', () => {
  beforeEach(() => {
    resetContentProductionStore()
  })

  it('moves an AI draft through content confirmation, Blog publishing, question selection and verification', async () => {
    const store = useContentProductionStore()
    const item = store.createFromBrief({ brief, keyFacts: facts })

    expect(item.stage).toBe('draft')
    expect(item.questions).toHaveLength(0)

    store.runAiCheck(item.id)
    expect(item.stage).toBe('ai_checked')
    expect(item.aiCheck?.passed).toBe(true)

    store.confirmContent(item.id, '客户已确认')
    expect(item.stage).toBe('ready_to_publish')
    expect(item.clientConfirmation?.status).toBe('confirmed')
    expect(item.clientConfirmation?.comment).toBe('客户已确认')

    store.publish(item.id)
    expect(item.stage).toBe('questions_pending')
    expect(item.url).toBeUndefined()
    expect(item.questions).toHaveLength(0)
    expect(item.questionCandidates).toHaveLength(5)

    store.selectQuestion(item.id, item.questionCandidates![0]!)
    expect(item.stage).toBe('questions_confirmed')
    expect(item.questions).toHaveLength(1)
    expect(item.questions[0]!.question).toBe(item.questionCandidates![0])
    expect(item.questions[0]!.confirmed).toBe(true)

    // The content needs 48 hours to take effect before verification.
    await store.startVerification(item.id)
    expect(item.stage).toBe('questions_confirmed')
    expect(item.questions[0]!.answers).toHaveLength(0)

    item.publishedAt = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString()
    await store.startVerification(item.id)
    expect(item.stage).toBe('verified')
    expect(item.roundId).toBe('r2')
    expect(item.lastChecked).toBeTruthy()
    expect(item.questions.every(question => question.answers.length > 0)).toBe(true)
    expect(item.questions.every(question => question.primaryCitationCount > 0)).toBe(true)
  })

  it('requires AI checking to pass before content can be confirmed', () => {
    const store = useContentProductionStore()
    const item = store.createFromBrief({ brief, keyFacts: facts })

    store.confirmContent(item.id)
    expect(item.stage).toBe('draft')
    expect(item.clientConfirmation).toBeUndefined()

    store.updateDraft(item.id, { body: '<h2>钛合金切割</h2><p>保证永久不出现分层。</p>' })
    store.runAiCheck(item.id)
    expect(item.stage).toBe('draft')
    expect(item.aiCheck?.passed).toBe(false)

    store.confirmContent(item.id)
    expect(item.stage).toBe('draft')
    expect(item.clientConfirmation).toBeUndefined()
  })

  it('allows editing after confirmation but requires checking and confirming again before publishing', () => {
    const store = useContentProductionStore()
    const item = store.createFromBrief({ brief, keyFacts: facts })

    store.runAiCheck(item.id)
    store.confirmContent(item.id)
    expect(item.stage).toBe('ready_to_publish')

    store.updateDraft(item.id, { body: '<h2>APW Waterjet 补充后的正文</h2><p>补充服务范围。</p>' })
    expect(item.stage).toBe('draft')
    expect(item.aiCheck).toBeUndefined()
    expect(item.clientConfirmation).toBeUndefined()

    store.publish(item.id)
    expect(item.publishedAt).toBeUndefined()
    expect(item.stage).toBe('draft')

    store.runAiCheck(item.id)
    expect(item.stage).toBe('ai_checked')
    store.confirmContent(item.id)
    expect(item.stage).toBe('ready_to_publish')

    store.publish(item.id)
    expect(item.stage).toBe('questions_pending')
    expect(item.publishedAt).toBeTruthy()
  })

  it('returns a failed publish to content review with a reason and allows a retry', () => {
    const store = useContentProductionStore()
    const item = store.createFromBrief({ brief, keyFacts: facts })

    store.runAiCheck(item.id)
    store.confirmContent(item.id)
    expect(store.publish(item.id, { simulateFailure: true })).toBe(false)
    expect(item.stage).toBe('ai_checked')
    expect(item.publishedAt).toBeUndefined()
    expect(item.clientConfirmation).toBeUndefined()
    expect(item.publishError).toBeTruthy()

    store.updateDraft(item.id, { body: '<h2>APW Waterjet 修订正文</h2><p>补充服务边界。</p>' })
    expect(item.publishError).toBeUndefined()

    store.runAiCheck(item.id)
    store.confirmContent(item.id)
    expect(store.publish(item.id)).toBe(true)
    expect(item.stage).toBe('questions_pending')
    expect(item.publishError).toBeUndefined()
  })

  it('imports an upload as ready to publish and creates questions after publishing', () => {
    const store = useContentProductionStore()
    const item = store.importContent({
      title: 'APW 航空复材切割服务说明',
      body: '<h2>航空复材切割</h2><p>APW 提供航空复材切割支持。</p>',
      keyFacts: facts,
    })

    expect(item.stage).toBe('ready_to_publish')
    expect(item.source).toBe('upload')
    expect(item.clientConfirmation?.status).toBe('confirmed')
    expect(item.questions).toHaveLength(0)

    store.publish(item.id)
    expect(item.stage).toBe('questions_pending')
    expect(item.questions).toHaveLength(0)
    expect(item.questionCandidates).toHaveLength(5)
  })

  it('requires the verification question to be confirmed before verifying', async () => {
    const store = useContentProductionStore()
    const item = store.importContent({
      title: 'APW 航空复材切割服务说明',
      body: '<h2>航空复材切割</h2><p>APW 提供航空复材切割支持。</p>',
      keyFacts: facts,
      url: 'https://apw.com/blog/aerospace-composite-cutting',
    })

    expect(item.questions).toHaveLength(0)
    expect(item.questionCandidates).toHaveLength(5)
    item.publishedAt = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString()
    await store.startVerification(item.id)

    expect(item.stage).toBe('questions_pending')
    expect(item.questions).toHaveLength(0)

    store.selectQuestion(item.id, 'APW 是否支持航空复材切割？')
    await store.startVerification(item.id)
    expect(item.stage).toBe('verified')
  })

  it('imports an already published article and counts it in the monthly quota', () => {
    const store = useContentProductionStore()
    const before = contentProductionSummary(store.state.items, 20)
    const item = store.importContent({
      title: 'APW 钛合金航空加工说明',
      body: '<h2>钛合金加工</h2><p>APW 提供钛合金切割支持。</p>',
      keyFacts: facts,
      url: 'https://apw.com/blog/titanium-aerospace',
    })
    const after = contentProductionSummary(store.state.items, 20)

    expect(item.stage).toBe('questions_pending')
    expect(item.source).toBe('imported')
    expect(item.questions).toHaveLength(0)
    expect(item.questionCandidates).toHaveLength(5)
    expect(after.published).toBe(before.published + 1)
  })
})
