import type { AuditFinding, GeoTask, Strategy } from '../data/geo-data'

import { isReadOnlyFinding } from '../workflows/finding-treatment'
import { isDirectRepairFinding } from '../workflows/direct-repair'

export const currentPeriod = '09/14–09/20'

export function nextTaskId(tasks: GeoTask[]) {
  return `T-${Math.max(2400, ...tasks.map(task => Number(task.id.replace(/\D/g, '')) || 0)) + 1}`
}

export function taskForStrategy(tasks: GeoTask[], strategy: Strategy) {
  return tasks.find(task => task.sourceKind !== 'geo-audit-content' && (task.strategy === strategy.id || task.relatedStrategies.includes(strategy.id)))
}

/** 同一策略只编排一次；相同执行目标可复用，已完成交付不被覆盖。 */
export function orchestrateStrategy(tasks: GeoTask[], strategy: Strategy): GeoTask {
  strategy.origin ??= 'buyer-coverage'
  const coverageGapRefs = strategy.coverageGapRefs ?? []
  const existing = taskForStrategy(tasks, strategy)
  if (existing) {
    strategy.confirmed = true
    return existing
  }
  const type = strategy.layer === '外部信源' ? 'external' : 'web'
  const destination = type === 'external' ? '外部内容交付' : strategy.layer === '内容' ? '官网内容' : 'AI 建站协同'
  const candidate = tasks.find((task) => {
    if (task.origin !== 'buyer-coverage' || !coverageGapRefs.length) return false
    if (task.sourceKind === 'geo-audit-content') return false
    return task.progress === 'brief' && task.strategyWindow === currentPeriod && task.type === type && (task.coverageGapRefs ?? []).some(ref => coverageGapRefs.includes(ref))
  })
  if (candidate) {
    if (!candidate.relatedStrategies.includes(strategy.id))
      candidate.relatedStrategies.push(strategy.id)
    candidate.source = [...new Set([...candidate.source.split(' / '), strategy.source])].join(' / ')
    candidate.persona = [...new Set([...candidate.persona.split('、'), ...strategy.persona.split('、')])].join('、')
    candidate.methods = [...new Set([...candidate.methods, ...strategy.methods])]
    candidate.coverageGapRefs = [...new Set([...(candidate.coverageGapRefs ?? []), ...coverageGapRefs])]
    strategy.confirmed = true
    return candidate
  }
  const task: GeoTask = {
    id: nextTaskId(tasks),
    name: strategy.title,
    origin: strategy.origin,
    priority: strategy.priority,
    type,
    source: strategy.source,
    coverageGapRefs,
    strategy: strategy.id,
    persona: strategy.persona,
    factor: strategy.factor,
    methods: [...strategy.methods],
    destination,
    progress: 'brief',
    relatedStrategies: [strategy.id],
    baselineVersion: 'V2',
    strategyWindow: currentPeriod,
  }
  tasks.push(task)
  strategy.confirmed = true
  return task
}

export function createRepairTask(tasks: GeoTask[], finding: AuditFinding): GeoTask {
  if (isReadOnlyFinding(finding)) throw new Error('仅提供建议的条目不生成修复任务')
  const existing = tasks.find(task => task.source.split(/[\s/·]+/).includes(finding.id))
  if (existing)
    return existing
  const task: GeoTask = {
    id: nextTaskId(tasks),
    name: finding.title,
    origin: 'geo-audit',
    priority: finding.priority,
    type: 'repair',
    source: finding.id,
    strategy: '',
    persona: '全站买家',
    factor: finding.check,
    methods: [finding.method],
    destination: 'AI 建站协同',
    progress: isDirectRepairFinding(finding) ? 'site_submitted' : 'human',
    relatedStrategies: [],
    baselineVersion: 'V2',
    strategyWindow: currentPeriod,
  }
  tasks.push(task)
  finding.status = '待专家审核'
  finding.checked = false
  return task
}

export function generateFindingStrategy(items: Strategy[], finding: AuditFinding): Strategy {
  if (isReadOnlyFinding(finding)) throw new Error('仅提供建议的条目不生成候选策略')
  const mappedId = /专家|作者/.test(finding.title) ? 'GS14' : undefined
  const existing = items.find(item => item.source.split(' / ').includes(finding.id) || (mappedId && item.id === mappedId))
  if (existing) {
    finding.status = '已生成策略'
    finding.checked = false
    return existing
  }
  const strategy: Strategy = {
    id: `GS${Math.max(14, ...items.map(item => Number(item.id.replace(/\D/g, '')) || 0)) + 1}`,
    origin: 'geo-audit',
    title: finding.title,
    description: finding.detail,
    evidence: `${finding.id} · ${finding.detail}`,
    source: finding.id,
    layer: '内容',
    priority: finding.priority,
    persona: '复材技术负责人、航空采购',
    factor: finding.category === '官网内容' ? finding.title : '认证与合规',
    methods: finding.category === '官网内容' ? [finding.method] : ['专家档案', '品牌事实核验'],
    confirmed: false,
  }
  items.push(strategy)
  finding.status = '已生成策略'
  finding.checked = false
  return strategy
}

