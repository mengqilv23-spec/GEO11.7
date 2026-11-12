import { describe, expect, it } from 'vitest'
import { contentVerificationItems } from './content-verification-data'
import { initialTasks } from './geo-data'
import { publishedContentTasks } from './published-content-tasks'

function contentByTask(taskId: string) {
  return contentVerificationItems.find(item => item.taskId === taskId)!
}

describe('content verification data', () => {
  it('builds one verification record per published content task', () => {
    expect(contentVerificationItems.map(item => item.taskId)).toEqual(['T-2404', 'T-2405', 'T-2406'])
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
    expect(chatgpt.citations).toHaveLength(0)
    expect(chatgpt.state).toBe('cited')
  })

  it('counts any page on the official site, not only the published URL', () => {
    const compare = contentByTask('T-2405')
    expect(compare.status).toBe('cited')
    expect(compare.questions[0]!.state).toBe('cited')
    const citations = compare.questions[0]!.answers.flatMap(answer => answer.citations)
    expect(citations.some(citation => citation.isPrimary && citation.url.includes('apw.com/compare'))).toBe(true)
    expect(citations.some(citation => citation.isPrimary && !citation.url.includes('/en/compare/waterjet-laser'))).toBe(true)
  })

  it('does not treat third-party citations as official website citations', () => {
    const aerospace = contentByTask('T-2406')
    const citations = aerospace.questions.flatMap(question => question.answers.flatMap(answer => answer.citations))
    expect(citations.some(citation => citation.isPrimary)).toBe(true)
    const thirdParty = citations.filter(citation => !citation.isPrimary)
    expect(thirdParty.length).toBeGreaterThan(0)
    expect(thirdParty.every(citation => citation.domain !== 'apw.com')).toBe(true)
  })

  it('verifies every aerospace fact against an official-site citation', () => {
    const aerospace = contentByTask('T-2406')
    expect(aerospace.status).toBe('cited')
    expect(aerospace.questions.map(question => question.state)).toEqual(['cited', 'cited'])
    expect(aerospace.lastChecked).toBe('2026-09-17')
  })

  it('frames every verification question as a searchable brand fact check', () => {
    const questions = contentVerificationItems.flatMap(item => item.questions)
    expect(questions.length).toBeGreaterThan(0)
    expect(questions.every(question => /^APW 是不是.+？$/.test(question.question))).toBe(true)
  })
})
