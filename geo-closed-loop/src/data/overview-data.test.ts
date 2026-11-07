import { describe, expect, it } from 'vitest'
import { auditFindings, initialTasks, strategies } from './geo-data'
import { buildOverviewQueue } from './overview-data'

describe('buildOverviewQueue', () => {
  it('includes actionable findings, unconfirmed strategies, and in-flight tasks only', () => {
    const findings = [
      { ...auditFindings[0]! },
      { ...auditFindings[1]!, id: 'F-done', status: '已修复' as const },
    ]
    const pendingStrategy = { ...strategies[0]! }
    const ignoredStrategy = { ...strategies[1]!, id: 'GS-ignored', ignored: true }
    const tasks = [
      { ...initialTasks[0]!, workflow: undefined },
      { ...initialTasks[1]!, id: 'T-done', progress: 'done' as const, workflow: undefined },
    ]

    const queue = buildOverviewQueue(findings, [pendingStrategy, ignoredStrategy], tasks)

    expect(queue.map(item => [item.kind, item.id])).toEqual([
      ['finding', findings[0]!.id],
      ['strategy', pendingStrategy.id],
      ['task', initialTasks[0]!.id],
    ])
    expect(queue.find(item => item.kind === 'finding')).toMatchObject({
      title: findings[0]!.title,
      priority: findings[0]!.priority,
      source: findings[0]!.check,
    })
  })

  it('does not include already reviewed findings or ignored/confirmed strategies', () => {
    const findings = [{ ...auditFindings[0]!, status: '已修复' as const }]
    const strategiesToExclude = [
      { ...strategies[0]!, confirmed: true },
      { ...strategies[1]!, ignored: true },
    ]

    expect(buildOverviewQueue(findings, strategiesToExclude, [])).toEqual([])
  })

  it('sorts actionable items by priority while preserving stable order within each priority', () => {
    const findings = [
      { ...auditFindings[0]!, id: 'F-P1', priority: 'P1' as const },
      { ...auditFindings[1]!, id: 'F-P0', priority: 'P0' as const },
    ]
    const strategy = { ...strategies[0]!, priority: 'P2' as const }
    const task = { ...initialTasks[0]!, workflow: undefined }

    const queue = buildOverviewQueue(findings, [strategy], [task])

    expect(queue.map(item => [item.priority, item.id])).toEqual([
      ['P0', 'F-P0'],
      ['P1', 'F-P1'],
      ['P1', task.id],
      ['P2', strategy.id],
    ])
  })
})

