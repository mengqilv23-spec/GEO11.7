import { describe, expect, it } from 'vitest'
import { auditChecks, auditFindings, clientContentReviewFindings, personas } from '../data/geo-data'
import { clientCheckResult, createClientFindingTask, normalizeClientFindings, personaEvidence, platformGapBreakdown, resolveGap, topicMetrics } from './client-diagnosis'

describe('unified client diagnosis', () => {
  it('uses the topic denominator, counts overlapping brands independently, deduplicates answers and computes gap from buyer attention', () => {
    const answers = Array.from({ length: 60 }, (_, i) => ({ id: String(i), theme: '服务', ownPositive: i < 15, rivalPositive: i < 36, negative: i === 59 }))
    answers.push({ ...answers[0]! })
    const result = topicMetrics(answers, '服务')
    expect(result).toMatchObject({ denominator: 60, ownHits: 15, rivalHits: 36, attention: 100, own: 25, rival: 60, gap: 75, negative: 1 })
    expect(topicMetrics([], '服务').gap).toBeNull()
    expect(topicMetrics(answers.map(row => ({ ...row, ownPositive: row.rivalPositive, rivalPositive: row.ownPositive })), '服务').gap).toBe(40)
    expect(topicMetrics(answers.map((row, index) => ({ ...row, topicPresent: index < 10 })), '服务').gap).toBe(-8.33)
    const evidence = personaEvidence(personas[0]!)
    for (const topic of evidence.topics) if (topic.gap !== null) expect(topic.gap).toBeCloseTo(topic.attention! - topic.own!)
    const chatgpt = personaEvidence(personas[0]!, 'ChatGPT')
    expect(chatgpt.answers).toHaveLength(6 * 34)
    expect(chatgpt.answers.every(answer => answer.platform === 'ChatGPT')).toBe(true)
    expect(chatgpt.topics.find(topic => topic.name === '本地服务与培训')?.denominator).toBe(34)
    expect(chatgpt.topics.find(topic => topic.name === '本地服务与培训')?.gap).toBeGreaterThan(0)
    const breakdown = platformGapBreakdown(personas[0]!, '本地服务与培训')
    expect(breakdown).toHaveLength(3)
    expect(breakdown.reduce((count, item) => count + item.denominator, 0)).toBe(100)
    expect(breakdown.some(item => item.gap !== evidence.topics.find(topic => topic.name === '本地服务与培训')?.gap)).toBe(true)
  })
  it('removes website content advice, classifies missing author facts as knowledge and derives check results', () => {
    const findings = normalizeClientFindings(auditFindings)
    expect(findings.some(item => item.id === 'F8-4')).toBe(false)
    expect(findings.find(item => item.id === 'F8-2')?.route).toBe('knowledge')
    expect(findings.find(item => item.id === 'F9')?.category).toBe('官网内容')
    expect(clientCheckResult(auditChecks[0]!, findings, []).state).toBe('通过')
    expect(clientCheckResult(auditChecks[4]!, findings.filter(item => item.route === 'knowledge'), []).state).toBe('待核对')
    expect(clientCheckResult(auditChecks[4]!, findings, []).state).toBe('异常')
  })
  it('creates an idempotent audit task directly without introducing a GAP strategy', () => {
    const tasks: Parameters<typeof createClientFindingTask>[0] = []
    const finding = clientContentReviewFindings[0]!
    const first = createClientFindingTask(tasks, finding)
    expect(createClientFindingTask(tasks, finding)).toBe(first)
    expect(tasks).toHaveLength(1)
    expect(first).toMatchObject({ type: 'web', progress: 'brief', strategy: '', relatedStrategies: [] })
  })
  it('routes the six causes without equating a positive GAP with a content fix', () => {
    const facts = { verified: true, capability: true, contentExists: true, clear: true, readable: true, thirdParty: false }
    expect(resolveGap({ ...facts, verified: false })).toBe('verify')
    expect(resolveGap({ ...facts, capability: false })).toBe('business-gap')
    expect(resolveGap({ ...facts, readable: false })).toBe('technical')
    expect(resolveGap({ ...facts, thirdParty: true })).toBe('external')
    expect(resolveGap({ ...facts, contentExists: false })).toBe('add-content')
    expect(resolveGap({ ...facts, clear: false })).toBe('edit-content')
  })
})

it('does not auto-generate content or submit a website for an investigation task', async () => {
  const { createVerificationTask } = await import('./client-diagnosis')
  const { strategies } = await import('../data/geo-data')
  const { ensureWorkflow, applyAction, advanceAutomatic } = await import('./task-workflow')
  const task = createVerificationTask([], { ...strategies[0]! })
  ensureWorkflow(task)
  const result = applyAction(task, 'client', 'agent', 'confirm_brief')
  expect(result).toBeNull()
  expect(task.progress).toBe('human')
  expect(advanceAutomatic(task, 'agent')).toBe(false)
  expect(task.workflow?.output.body).toBe('')
})

