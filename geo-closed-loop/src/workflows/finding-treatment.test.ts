import { describe, expect, it } from 'vitest'
import { auditFindings } from '../data/geo-data'
import { buildOverviewQueue } from '../data/overview-data'
import { createRepairTask, generateFindingStrategy } from '../services/geo-orchestration'
import { isDirectRepairFinding } from './direct-repair'
import { findingRouteLabel, isAdviceFinding } from './finding-treatment'

const advice = auditFindings.filter(isAdviceFinding)
describe('advice-only findings', () => {
  it('covers both website scopes without treating advice as a direct repair', () => {
    expect(advice.map(item => item.category)).toEqual(['官网结构', '官网内容'])
    for (const finding of advice) {
      expect(findingRouteLabel(finding)).toBe(`${finding.category} · 仅提供建议`)
      expect(isDirectRepairFinding(finding)).toBe(false)
      expect(finding.status).toBe('无需处理')
    }
  })
  it('never enqueues advice or generates work even with an outdated pending status', () => {
    for (const seed of advice) {
      const finding = { ...seed, status: '待处理' as const, checked: true }
      const tasks: Parameters<typeof createRepairTask>[0] = []
      const strategies: Parameters<typeof generateFindingStrategy>[0] = []
      expect(buildOverviewQueue([finding], [], [])).toEqual([])
      expect(() => createRepairTask(tasks, finding)).toThrow('不生成修复任务')
      expect(() => generateFindingStrategy(strategies, finding)).toThrow('不生成候选策略')
      expect(tasks).toEqual([])
      expect(strategies).toEqual([])
      expect(finding.status).toBe('待处理')
    }
  })
})

it('keeps missing-knowledge reminders read-only and out of execution queues', () => {
  const finding = auditFindings.find(item => item.route === 'knowledge')!
  expect(findingRouteLabel(finding)).toBe('官网内容 · 待补充知识')
  expect(finding.status).toBe('待补充知识')
  expect(finding.advice).toContain('下一次监测')
  expect(buildOverviewQueue([finding], [], [])).toEqual([])
  expect(() => createRepairTask([], finding)).toThrow()
  expect(() => generateFindingStrategy([], finding)).toThrow()
})

