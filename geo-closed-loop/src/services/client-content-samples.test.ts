import { expect, it } from 'vitest'
import { clientContentReviewFindings } from '../data/geo-data'
import type { GeoTask, Strategy } from '../data/geo-data'
import { generateFindingStrategy, orchestrateStrategy } from './geo-orchestration'

it('creates independent website content Brief tasks for the six review samples', () => {
  const strategies: Strategy[] = []
  const tasks: GeoTask[] = []
  expect(clientContentReviewFindings).toHaveLength(6)
  for (const seed of clientContentReviewFindings) {
    const finding = { ...seed }
    expect(finding.status).toBe('待处理')
    const strategy = generateFindingStrategy(strategies, finding)
    expect(strategy.layer).toBe('内容')
    const task = orchestrateStrategy(tasks, strategy)
    expect(task.type).toBe('web')
    expect(task.progress).toBe('brief')
    expect(task.methods).toContain('官网内容核对与改写')
  }
  expect(tasks).toHaveLength(6)
})

