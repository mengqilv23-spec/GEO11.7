import { describe, expect, it } from 'vitest'
import { codeReviewDemoTasksFor, codeReviewTestFindings } from './code-review-demo-tasks'

const names = ['任务名称1', '任务名称2', '任务名称3', '任务名称4']

describe('code review demo tasks', () => {
  it('seeds four named code-review tasks ready for customer review', () => {
    const tasks = codeReviewDemoTasksFor()

    expect(tasks.map(task => task.name)).toEqual(names)
    expect(tasks.map(task => task.progress)).toEqual(['client_review', 'client_review', 'client_review', 'client_review'])
    expect(tasks.map(task => task.source)).toEqual(['CR-01', 'CR-02', 'CR-03', 'CR-04'])
    expect(tasks.every(task => task.contentFormat === 'code')).toBe(true)
    expect(tasks.every(task => task.workflow?.output.body.startsWith('<pre><code>'))).toBe(true)
    expect(tasks.every(task => task.workflow?.output.body.includes('&lt;script'))).toBe(true)
  })

  it('links each task to a code-review finding in the diagnosis list', () => {
    expect(codeReviewTestFindings.map(finding => finding.id)).toEqual(['CR-01', 'CR-02', 'CR-03', 'CR-04'])
    expect(codeReviewTestFindings.map(finding => finding.title)).toEqual(names)
    expect(codeReviewTestFindings.every(finding => finding.contentFormat === 'code')).toBe(true)
    expect(codeReviewTestFindings.every(finding => finding.treatment === 'website-content-review')).toBe(true)
    expect(codeReviewTestFindings.every(finding => finding.status === '待处理')).toBe(true)
  })
})
