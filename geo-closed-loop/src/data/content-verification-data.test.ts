import { describe, expect, it } from 'vitest'
import { contentVerificationItems } from './content-verification-data'
import { initialTasks } from './geo-data'
import { publishedContentTasks } from './published-content-tasks'

function contentByTask(taskId: string) {
  return contentVerificationItems.find(item => item.taskId === taskId)!
}

describe('content verification data', () => {
  it('builds one verification record per published content task', () => {
    expect(contentVerificationItems.map(item => item.taskId)).toEqual(['T-2404', 'T-2405', 'T-2406', 'T-2407', 'T-2408', 'T-2409'])
  })

  it('assigns every article to exactly one detection round', () => {
    const firstRound = contentVerificationItems.filter(item => item.roundId === 'r1').map(item => item.taskId)
    const secondRound = contentVerificationItems.filter(item => item.roundId === 'r2').map(item => item.taskId)

    expect(firstRound).toEqual(['T-2404', 'T-2405', 'T-2406'])
    expect(secondRound).toEqual(['T-2407', 'T-2408', 'T-2409'])
    expect(new Set([...firstRound, ...secondRound]).size).toBe(contentVerificationItems.length)
  })

  it('links every content record to a task that exists in the workbench', () => {
    const taskIds = new Set([...initialTasks, ...publishedContentTasks].map(task => task.id))
    expect(contentVerificationItems.every(item => taskIds.has(item.taskId))).toBe(true)
  })

  it('marks official website citations as the primary evidence', () => {
    const carbon = contentByTask('T-2404')
    expect(carbon.status).toBe('cited')
    expect(carbon.questions).toHaveLength(1)
    expect(carbon.questions[0]!.state).toBe('cited')
    expect(carbon.questions[0]!.primaryCitationCount).toBeGreaterThan(0)
    const primary = carbon.questions[0]!.answers.flatMap(answer => answer.citations).find(citation => citation.isPrimary)
    expect(primary?.domain).toBe('apw.com')
  })

  it('marks every platform answer as an official-site success', () => {
    const answers = contentVerificationItems.flatMap(item => item.questions.flatMap(question => question.answers))
    expect(answers.length).toBeGreaterThan(0)
    expect(answers.every(answer => answer.state === 'cited')).toBe(true)
    const carbon = contentByTask('T-2404')
    const chatgpt = carbon.questions[0]!.answers.find(answer => answer.platform === 'chatgpt')!
    expect(chatgpt.citations.length).toBeGreaterThan(0)
    expect(chatgpt.state).toBe('cited')
  })

  it('counts any page on the official site, not only the published URL', () => {
    const aerospace = contentByTask('T-2406')
    expect(aerospace.status).toBe('cited')
    expect(aerospace.questions[0]!.state).toBe('cited')
    const citations = aerospace.questions[0]!.answers.flatMap(answer => answer.citations)
    expect(citations.some(citation => citation.isPrimary && citation.url.includes('apw.com/solutions/q7'))).toBe(true)
    expect(citations.some(citation => citation.isPrimary && !citation.url.includes('/en/applications/aerospace'))).toBe(true)
  })

  it('does not treat third-party citations as official website citations', () => {
    const carbon = contentByTask('T-2404')
    const citations = carbon.questions.flatMap(question => question.answers.flatMap(answer => answer.citations))
    expect(citations.some(citation => citation.isPrimary)).toBe(true)
    const thirdParty = citations.filter(citation => !citation.isPrimary)
    expect(thirdParty.length).toBeGreaterThan(0)
    expect(thirdParty.every(citation => citation.domain !== 'apw.com')).toBe(true)
  })

  it('keeps one verification question per published article', () => {
    expect(contentVerificationItems.every(item => item.questions.length === 1)).toBe(true)
  })

  it('shows the platform answer without sampling-batch narration', () => {
    const answers = contentVerificationItems.flatMap(item => item.questions.flatMap(question => question.answers))
    expect(answers.every(answer => !/第\s*\d+\s*次采集/.test(answer.answer))).toBe(true)
  })

  it('keeps the source HTML snapshot for every platform answer', () => {
    const answers = contentVerificationItems.flatMap(item => item.questions.flatMap(question => question.answers))
    expect(answers.length).toBeGreaterThan(0)
    expect(answers.every(answer => answer.htmlSnapshot?.startsWith('<!DOCTYPE html>'))).toBe(true)
  })

  it('verifies the aerospace question against an official-site citation', () => {
    const aerospace = contentByTask('T-2406')
    expect(aerospace.status).toBe('cited')
    expect(aerospace.questions.map(question => question.state)).toEqual(['cited'])
    expect(aerospace.lastChecked).toBe('2026-09-15')
  })

  it('frames every verification question as a searchable brand fact check', () => {
    const questions = contentVerificationItems.flatMap(item => item.questions)
    expect(questions.length).toBeGreaterThan(0)
    expect(questions.every(question => /^APW 是不是.+？$/.test(question.question))).toBe(true)
  })
})
