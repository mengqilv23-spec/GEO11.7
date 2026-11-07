import type { AuditCheck, AuditFinding, GeoTask, Persona, Strategy } from '../data/geo-data'
import { officialContentSnapshot } from '../data/geo-data'

export const diagnosisPlatforms = ['ChatGPT', 'Perplexity', 'Google AI'] as const
export type DiagnosisPlatform = '全部平台' | typeof diagnosisPlatforms[number]
export interface TopicAnswer { id: string, theme: string, platform?: typeof diagnosisPlatforms[number], topicPresent?: boolean, ownPositive: boolean, rivalPositive: boolean, negative: boolean }
export function topicMetrics(answers: readonly TopicAnswer[], theme: string) {
  const unique = new Map<string, TopicAnswer>()
  for (const row of answers.filter(row => row.theme === theme)) {
    const previous = unique.get(row.id)
    unique.set(row.id, previous ? { ...row, topicPresent: (row.topicPresent ?? true) || (previous.topicPresent ?? true), ownPositive: row.ownPositive || previous.ownPositive, rivalPositive: row.rivalPositive || previous.rivalPositive, negative: row.negative || previous.negative } : row)
  }
  const relevant = [...unique.values()]
  const denominator = relevant.length
  const ownHits = relevant.filter(row => row.ownPositive).length
  const rivalHits = relevant.filter(row => row.rivalPositive).length
  const attentionHits = relevant.filter(row => row.topicPresent ?? true).length
  const attention = denominator ? Number((attentionHits / denominator * 100).toFixed(2)) : null
  const own = denominator ? Number((ownHits / denominator * 100).toFixed(2)) : null
  const rival = denominator ? Number((rivalHits / denominator * 100).toFixed(2)) : null
  return { denominator, attentionHits, attention, ownHits, rivalHits, own, rival, gap: own === null || rival === null ? null : Number((rival - own).toFixed(2)), negative: relevant.filter(row => row.negative).length, answerIds: relevant.map(row => row.id) }
}

// Explicit prototype sampling fixtures; these records do not represent live collection.
export function personaEvidence(persona: Persona, platform: DiagnosisPlatform = '全部平台') {
  const answers: TopicAnswer[] = persona.factors.filter(factor => factor.name !== '其他').flatMap((factor) => Array.from({ length: 100 }, (_, i) => ({
    id: `${persona.id}-${i + 1}`, theme: factor.name, platform: diagnosisPlatforms[i % diagnosisPlatforms.length]!,
    topicPresent: i < Math.min(100, Math.max(factor.coverage, factor.competitor) + 8),
    ownPositive: i < factor.coverage, rivalPositive: i < factor.competitor, negative: false,
  })))
  const selectedAnswers = platform === '全部平台' ? answers : answers.filter(answer => answer.platform === platform)
  return { answers: selectedAnswers, topics: persona.factors.map(factor => ({ name: factor.name, ...topicMetrics(selectedAnswers, factor.name) })) }
}
export function platformGapBreakdown(persona: Persona, theme: string) {
  return diagnosisPlatforms.map(platform => ({ platform, ...personaEvidence(persona, platform).topics.find(topic => topic.name === theme)! }))
}
export function normalizeClientFindings(items: AuditFinding[]) {
  return items.filter(item => !(item.route === 'advice' && item.category !== '官网结构')).map(item => {
    const copy = { ...item }
    if (copy.id === 'F9') { copy.route = 'strategy'; copy.treatment = 'website-content-review'; copy.category = '官网内容'; copy.title = '官网地址与已确认资料不一致'; copy.detail = '核对记录：官网地址与已确认的企业资料不一致；本任务仅调整官网内容，外部平台信息另行核查。'; copy.method = '官网地址内容核对'; copy.routeReason = '先由客户确认官网内容修改，再进入任务 Brief；不自动修改 LinkedIn 或行业名录。' }
    if (copy.id === 'F8-2') { copy.route = 'knowledge'; copy.treatment = 'website-content-knowledge'; copy.category = '官网内容'; copy.status = '待补充知识'; copy.knowledgeTopic = '工程师身份与专业背景'; copy.advice = '请补充已核实的工程师身份、专业背景及作者介绍资料；补充后下一次监测重新核对。'; copy.routeReason = '未有标准身份资料前，无法判断官网作者介绍是否完整或准确，不生成改写任务。' }
    return copy
  })
}
export function clientCheckResult(check: AuditCheck, findings: AuditFinding[], tasks: GeoTask[]) {
  const related = findings.filter(item => item.check === check.label && item.route !== 'advice')
  const unresolved = related.filter(item => item.status !== '已修复' && !tasks.some(task => task.progress === 'done' && task.source.split(/[\s/·]+/).includes(item.id)))
  const errors = unresolved.filter(item => item.route !== 'knowledge').length
  const unknown = unresolved.filter(item => item.route === 'knowledge').length
  return { state: errors ? '异常' : unknown ? '待核对' : '通过', errors, unknown }
}
export function createClientFindingTask(tasks: GeoTask[], finding: AuditFinding): GeoTask {
  const existing = tasks.find(task => task.type === 'web' && task.source === finding.id && !task.strategy)
  if (existing) {
    const snapshot = officialContentSnapshot(finding)
    if (snapshot) {
      existing.sourceKind = 'geo-audit-content'
      existing.auditContent = snapshot
    }
    return existing
  }
  if (finding.route !== 'strategy') throw Error('当前条目不能生成内容任务')
  const auditContent = officialContentSnapshot(finding)
  const task: GeoTask = { id: `T-${Math.max(2500, ...tasks.map(task => Number(task.id.replace(/\D/g, '')) || 0)) + 1}`, name: finding.title, origin: 'geo-audit', type: 'web', source: finding.id, strategy: '', persona: '官网目标买家', factor: finding.check, methods: [finding.method], destination: '官网内容', progress: 'brief', relatedStrategies: [], evidence: finding.evidence ?? finding.detail, sourceKind: auditContent ? 'geo-audit-content' : undefined, auditContent }
  tasks.push(task)
  return task
}
export function strategyGapEvidence(strategy: Strategy, personas: readonly Persona[]) {
  const candidates = personas.filter(persona => strategy.personaIds?.includes(persona.id))
  for (const persona of candidates.length ? candidates : personas) {
    const evidence = personaEvidence(persona)
    const topic = evidence.topics.find(topic => strategy.gapNames?.includes(topic.name) && topic.gap !== null && topic.gap > 0)
    if (topic) return { persona: persona.name, topic, evidence }
  }
  return null
}

/** Stable references to positive buyer-coverage gaps that support a strategy. */
export function strategyCoverageGapRefs(strategy: Strategy, personas: readonly Persona[]) {
  return personas
    .filter(persona => strategy.personaIds?.includes(persona.id))
    .flatMap(persona => personaEvidence(persona).topics
      .filter(topic => strategy.gapNames?.includes(topic.name) && topic.gap !== null && topic.gap > 0)
      .map(topic => `${persona.id}:${topic.name}`))
}

export interface GapFacts { verified: boolean, capability: boolean | null, contentExists: boolean, clear: boolean, readable: boolean, thirdParty: boolean }
export function resolveGap(facts: GapFacts) {
  if (!facts.verified || facts.capability === null) return 'verify'
  if (!facts.capability) return 'business-gap'
  if (!facts.readable) return 'technical'
  if (facts.thirdParty) return 'external'
  if (!facts.contentExists) return 'add-content'
  if (!facts.clear) return 'edit-content'
  return 'verify'
}
// Audited scenario fixtures, not automatic conclusions inferred from a positive GAP.
export function clientStrategyPlan(strategy: Strategy) {
  const facts: GapFacts = { verified: false, capability: null, contentExists: true, clear: true, readable: true, thirdParty: false }
  if (strategy.id === 'GS13') Object.assign(facts, { verified: true, capability: true, contentExists: false })
  else if (['GS1', 'GS10', 'GS11'].includes(strategy.id)) Object.assign(facts, { verified: true, capability: true, clear: false })
  else if (strategy.layer === '外部信源') Object.assign(facts, { verified: true, capability: true, thirdParty: true })
  else if (strategy.id === 'GS14') Object.assign(facts, { verified: false, capability: null })
  if (strategy.gapFacts) Object.assign(facts, strategy.gapFacts)
  const kind = resolveGap(facts)
  const labels = { verify: '先核查原因', 'business-gap': '记录业务能力缺口', technical: '关联技术修复', external: '建设第三方内容', 'add-content': '补充官网内容', 'edit-content': '修改官网内容' }
  return { kind, label: labels[kind], facts, conclusion: kind === 'business-gap' ? '已核实不具备对应业务能力，记录业务能力缺口，不生成宣称具备该能力的内容。' : kind === 'technical' ? '内容已存在，但读取存在障碍，关联官网结构直接处理，不创建文章任务。' : kind === 'verify' ? '尚缺少已核实的业务能力或原因依据，先核查，不直接生成宣传内容。' : kind === 'external' ? '核实记录：具备对应能力，相关回答依赖第三方来源，评估外部内容机会。' : kind === 'add-content' ? '核实记录：具备对应业务能力，官网缺少相应介绍。' : '核实记录：已有相关能力及官网介绍，需要明确品牌、适用范围和依据。' }
}

export function createVerificationTask(tasks: GeoTask[], strategy: Strategy): GeoTask {
  const existing = tasks.find(task => task.executionKind === 'verification' && task.strategy === strategy.id)
  if (existing) return existing
  const task: GeoTask = { id: `T-${Math.max(2500, ...tasks.map(task => Number(task.id.replace(/\D/g, '')) || 0)) + 1}`, name: `核查：${strategy.title}`, origin: strategy.origin ?? 'buyer-coverage', executionKind: 'verification', type: 'web', source: strategy.source, strategy: strategy.id, persona: strategy.persona, factor: strategy.factor, methods: ['核查原始回答、真实业务能力与已有资料'], destination: '核查记录', progress: 'brief', relatedStrategies: [strategy.id], evidence: strategy.evidence }
  tasks.push(task)
  strategy.confirmed = true
  return task
}

