import type { ReportType } from './report-center-data'
import { initialReports } from './report-center-data'

export interface ReportMetric {
  label: string
  value: string
  delta: string
  baseline: string
  note: string
}

export interface ReportDetailProfile {
  type: ReportType
  label: string
  title: string
  date: string
  cycle: string
  cadence: string
  comparison: string
  focus: string
  summaryLead?: string
  summaryCopy?: string
  status: 'generated' | 'outline' | 'generating' | 'failed' | 'archived'
  metrics: ReportMetric[]
  highlights: Array<{ title: string, description: string }>
  platforms: Array<{ name: string, mention: string, citations: string, sample: string, movement: string, displayStatus?: number, avgRank?: string }>
  personas: Array<{ name: string, mention: string, confidence: string }>
  questions: Array<{ question: string, persona: string, platforms: string, officialEvidence: string, trend: string, answer?: string, rank?: string, sample?: string, confidence?: string }>
  sources: Array<{ domain: string, citations: string, answers: string, platforms: string, ourMentioned?: string }>
  recommendations: Array<{ title: string, description: string, priority: string, evidence: string }>
  scopeSummary?: string
  personaCount?: number
  intentCount?: number
  keywordCount?: number
  questionCount?: number
  platformCount?: number
  trendPoints?: Array<{
    date: string
    value: number
    metricCode?: string
    roundId?: number
    ciLow?: number | null
    ciHigh?: number | null
    sort?: number
  }>
  competitorRanks?: Array<{ name: string, mention: string, recommend: string, citation: string, rank: number, isOwn?: boolean }>
  competitorSummary?: string
  competitorNarratives?: string[]
  ribbon?: { sovRate: string, headCompetitor: string, ownRank: string, mentionGap: string, recommendGap: string, soaBottomLabel: string, soaBottomValue: string }
  credibility?: { totalSample: string, validSample: string, validReturnRate: string, dualSourceRate: string, manualReviewRate: string, overallCi: string }
  metricRows?: Array<{ code?: string, name: string, dimension: string, dimensionType: string, value: string, unit: string, sample: string }>
  personaThemeMatrix?: Array<{ persona: string, theme: string, value: string }>
  intentMetrics?: Array<{ name: string, value: string, sample: string }>
  evidences?: Array<{ title: string, type: string, domain: string, platform: string, excerpt: string, url: string }>
  sourcePages?: Array<{ title: string, domain: string, citations: string, url: string, questionCount?: string, platforms?: string, ourMentioned?: string, competitors?: string }>
  competitorDetails?: {
    ownBrandName: string
    brands: string[]
    platformMatrix: Array<{ dimension: string, values: Record<string, { value: string, numerator: number | null, denominator: number | null }> }>
    personaIntentMatrix: Array<{ dimension: string, values: Record<string, { value: string, numerator: number | null, denominator: number | null }> }>
    sourceCooccurrence: Array<{ title: string, domain: string, citations: string, platforms: string, ourMentioned: string, competitors: string, url: string }>
    narratives: { gapPlatform: string, gapPersonaIntent: string, gapSource: string }
  }
  isLiveData?: boolean
}

const commonPlatforms = [
  { name: 'Google AI Overviews', mention: '46%', citations: '18%', sample: 'n=240', movement: '↑ 5pp' },
  { name: 'Gemini', mention: '39%', citations: '16%', sample: 'n=240', movement: '↑ 3pp' },
  { name: 'ChatGPT', mention: '42%', citations: '17%', sample: 'n=240', movement: '↑ 4pp' },
  { name: 'Perplexity', mention: '31%', citations: '14%', sample: 'n=240', movement: '↑ 2pp' },
  { name: 'Claude', mention: '—', citations: '—', sample: '已纳入当前口径', movement: '分项待补齐' },
]

const sharedPersonas = [
  { name: '复材加工技术主管', mention: '62%', confidence: '±8.2pp' },
  { name: '航空部件采购经理', mention: '55%', confidence: '±8.8pp' },
  { name: '精密加工车间主管', mention: '48%', confidence: '±9.4pp' },
  { name: '商社设备采购担当', mention: '29%', confidence: '±10.1pp' },
]

const sharedQuestions = [
  { question: 'Welche Wasserstrahlanlagen empfehlen sich für Anwendungen in der Luftfahrt?', persona: '航空部件采购经理', platforms: 'ChatGPT #1 · Perplexity #2 · Google AI #2', officialEvidence: 'APW 官网页面', trend: '↑ 上升' },
  { question: 'Was kostet das präzise Wasserstrahlschneiden von CFRP für kleine Serien?', persona: '航空部件采购经理', platforms: 'ChatGPT #4 · Perplexity 未提及 · Google AI #2', officialEvidence: '缺少官网证据', trend: '↓ 下降' },
  { question: 'Wie lassen sich Ausfransungen beim Schneiden von Verbundwerkstoffen vermeiden?', persona: '精密加工车间主管', platforms: 'ChatGPT #2 · Perplexity #4 · Google AI 未提及', officialEvidence: '缺少官网证据', trend: '→ 持平' },
]

const sharedSources = [
  { domain: 'compositesworld.com', citations: '30', answers: '14', platforms: 'ChatGPT · Perplexity · Google AI' },
  { domain: 'apw.com', citations: '17', answers: '11', platforms: 'ChatGPT · Perplexity · Google AI' },
  { domain: 'reddit.com', citations: '18', answers: '8', platforms: 'ChatGPT · Perplexity' },
  { domain: 'thefabricator.com', citations: '14', answers: '6', platforms: 'ChatGPT · Google AI' },
]

const sharedRecommendations = [
  { title: '补齐采购场景的官网答案', description: '优先完善小批量成本、供应商选择、交期与本地服务内容，形成可被 AI 引用的第一方证据。', priority: 'P0', evidence: '采购场景问题命中与官网引用' },
  { title: '强化钛合金加工主题覆盖', description: '补充加工边界、精度范围和适用案例，并在下个监测周期复核相关问题的品牌提及与推荐。', priority: 'P1', evidence: '人设 × 关键词表现' },
  { title: '跟踪领先竞品的回答差距', description: '按相同问题集比较 APW 与 Flow 的平台表现，定位差距最大的意图和来源页面。', priority: 'P1', evidence: '综合竞品表现与逐题证据' },
]

const profiles: Record<ReportType, ReportDetailProfile> = {
  weekly: {
    type: 'weekly',
    label: '周报',
    title: '本周 GEO 表现与优化简报',
    date: '2026-09-15',
    cycle: '2026-09-08—09-14',
    cadence: '每周按固定计划采集',
    comparison: '较上周 09/01—09/07',
    focus: '整体可见性上升，但关键采购问题仍未形成稳定优势。品牌提及率升至 42%，推荐率升至 28%；商社设备采购担当提及率仅 29%，官网引用率为 17%。',
    status: 'generated',
    metrics: [
      { label: '品牌提及率（SOA）', value: '42%', delta: '+4pp', baseline: '38%', note: 'Wilson 95% 置信区间：±2.8pp' },
      { label: '品牌推荐率', value: '28%', delta: '+4pp', baseline: '24%', note: '基于有效推荐回答' },
      { label: '官网引用率', value: '17%', delta: '+2pp', baseline: '15%', note: '官网页面被答案引用比例' },
      { label: '声量份额（SOV）', value: '27%', delta: '+4pp', baseline: '23%', note: '竞品提及总量口径' },
    ],
    highlights: [
      { title: '本周变化', description: '四项核心指标均较上周上升，品牌提及率增加 4 个百分点。' },
      { title: '平台拆解', description: 'Google AI Overviews 为 46%、Gemini 为 39%，高于 Perplexity 的 31%。' },
      { title: '人设与意图', description: '认知、评估、决策场景提及率分别为 61%、52%、43%；采购人设仍偏弱。' },
      { title: '来源关联', description: 'compositesworld.com 被引用 30 次；官网引用仍有提升空间。' },
    ],
    platforms: commonPlatforms,
    personas: sharedPersonas,
    questions: sharedQuestions,
    sources: sharedSources,
    recommendations: sharedRecommendations,
  },
  adhoc: {
    type: 'adhoc',
    label: '次报',
    title: '本次 GEO 监测周期报告',
    date: '2026-09-15',
    cycle: '2026-09-15 单次采集',
    cadence: '监测周期完成后生成',
    comparison: '本次监测结果',
    focus: '本次监测中，APW 综合排名第 2；采购相关问题和对应官网证据值得优先关注。该报告记录一次监测快照，不代表长期趋势。',
    status: 'generated',
    metrics: [
      { label: '品牌提及率（SOA）', value: '42%', delta: '本次结果', baseline: '—', note: '单次采集，不作周期趋势判断' },
      { label: '品牌推荐率', value: '28%', delta: '本次结果', baseline: '—', note: '基于本次有效回答' },
      { label: '官网引用率', value: '17%', delta: '本次结果', baseline: '—', note: '官网页面被答案引用比例' },
      { label: '声量份额（SOV）', value: '27%', delta: '本次结果', baseline: '—', note: '竞品提及总量口径' },
    ],
    highlights: [
      { title: '本次总体结果', description: 'APW 本次综合排名第 2，覆盖表现因平台与问题场景而异。' },
      { title: '采购问题缺口', description: '供应商选择与小批量成本相关问题需要补足第一方信息。' },
      { title: '平台差异', description: 'Google 系平台表现相对较好；Perplexity 的覆盖仍可提升。' },
      { title: '证据可信度', description: '本报告基于单次采集快照，建议与后续周期结果联合判断。' },
    ],
    platforms: commonPlatforms,
    personas: sharedPersonas,
    questions: sharedQuestions,
    sources: sharedSources,
    recommendations: sharedRecommendations,
  },
  monthly: {
    type: 'monthly',
    label: '月报',
    title: '9月 GEO 月度表现与复盘',
    date: '2026-10-01',
    cycle: '2026-09-01—09-30',
    cadence: '每月汇总',
    comparison: '较上月 2026-08-01—08-31',
    focus: '本月 APW 综合排名第 2；月度结果整体改善，但采购场景与官网信源建设仍是下一阶段的优先项。',
    status: 'generated',
    metrics: [
      { label: '品牌提及率（SOA）', value: '44%', delta: '+3pp', baseline: '41%', note: '演示口径：95% 置信区间约 ±1.3pp' },
      { label: '品牌推荐率', value: '31%', delta: '+3pp', baseline: '28%', note: '推荐有效回答口径' },
      { label: '官网引用率', value: '19%', delta: '+2pp', baseline: '17%', note: '有效回答口径' },
      { label: '声量份额（SOV）', value: '29%', delta: '+3pp', baseline: '26%', note: '竞品提及总量口径' },
    ],
    highlights: [
      { title: '月度趋势', description: '本月提及率、推荐率和官网引用率较上月均有提升。' },
      { title: '平台差异', description: '不同 AI 平台之间仍存在覆盖差异，需继续关注 Perplexity。' },
      { title: '采购场景短板', description: '商社设备采购与成本评估问题的提及率低于技术信息查询。' },
      { title: '信源结构', description: '第三方来源引用仍高于 APW 官网，需持续强化可引用页面。' },
    ],
    platforms: commonPlatforms,
    personas: sharedPersonas,
    questions: sharedQuestions,
    sources: sharedSources,
    recommendations: sharedRecommendations,
  },
  quarterly: {
    type: 'quarterly',
    label: '季报',
    title: '2026 年第三季度 GEO 竞争格局复盘',
    date: '2026-10-01',
    cycle: '2026 Q3（2026-07-01—09-30）',
    cadence: '每季度汇总',
    comparison: '较上季度 2026 Q2',
    focus: '本季度 APW 综合排名第 2；结合竞争位置和持续差距，明确下一季度优化重点。',
    status: 'outline',
    metrics: [
      { label: '品牌提及率（SOA）', value: '46%', delta: '+3pp', baseline: '43%', note: '演示口径：95% 置信区间约 ±0.7pp' },
      { label: '品牌推荐率', value: '33%', delta: '+3pp', baseline: '30%', note: '推荐有效回答口径' },
      { label: '官网引用率', value: '20%', delta: '+1pp', baseline: '19%', note: '有效回答口径' },
      { label: '声量份额（SOV）', value: '31%', delta: '+2pp', baseline: '29%', note: '竞品提及总量口径' },
    ],
    highlights: [
      { title: '整体指标改善', description: '核心可见性指标较上季度提升，竞争位置保持在第 2。' },
      { title: '竞争位置', description: 'APW 领先 OMAX、KMT，仍落后于 Flow。' },
      { title: '结构性短板', description: '采购场景持续偏弱，技术信息查询场景相对占优。' },
      { title: '信源格局', description: '外部来源引用仍占多数，官网内容需补充可核验业务证据。' },
    ],
    platforms: commonPlatforms,
    personas: sharedPersonas,
    questions: sharedQuestions,
    sources: sharedSources,
    recommendations: sharedRecommendations,
  },
}

const sectionLabels = [
  ['summary', '一、管理层结论'],
  ['analysis', '二、本期关键发现'],
  ['evidence', '三、综合竞品表现'],
  ['details', '四、监测明细'],
  ['strategy', '五、优化建议'],
] as const

export function getReportDetailData(reportId: string): ReportDetailProfile | null {
  const report = initialReports.find(item => item.id === reportId)
  const prefix = report?.type ?? reportId.split('-')[0]
  if (!Object.hasOwn(profiles, prefix))
    return null

  const profile = profiles[prefix as ReportType]
  return { ...profile, status: report?.status ?? profile.status, date: report?.date ?? profile.date }
}

export function getReportSectionLabels() {
  return sectionLabels
}

