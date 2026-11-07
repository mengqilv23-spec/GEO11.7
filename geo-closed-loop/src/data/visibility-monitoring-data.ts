export type VisibilityTab = 'brand' | 'questions' | 'sources'
export type TrendMode = 'overall' | 'engine' | 'persona' | 'competitors'
export type SamplingFrequency = 'daily' | 'weekly' | 'monthly'
export type MonitoringPlatformId = 'chatgpt' | 'perplexity' | 'google-ai' | 'gemini' | 'ai-mode' | 'claude'
export type QuestionTrend = 'up' | 'flat' | 'down'

export interface TrendSeries {
  id: string
  label: string
  color: string
  values: number[]
}

export interface HeatmapCell {
  row: string
  column: string
  value: number
}

export interface PlatformResult {
  platform: MonitoringPlatformId
  ownBrandMentioned: boolean
  competitorsMentioned: string[]
  officialSiteCited: boolean
  rank: number | null
  sentiment: 'positive' | 'neutral' | 'negative'
  htmlSnapshot?: string
  citations?: Array<{ url: string, excerpt: string }>
  answer: string
  citedPages: string[]
}

export interface SamplingBatch {
  id: string
  date: string
  validResponses: number
  totalResponses: number
  confidenceInterval: number
}

export interface MonitoringQuestion {
  id: string
  question: string
  keyword: string
  type: '品牌词' | '业务词' | '产品词'
  persona: string
  stage: string
  intent: string
  concern: string
  platformResults: PlatformResult[]
  competitors: string[]
  officialSiteCited: boolean
  rank: number | null
  trend: QuestionTrend
  samplingSummary?: { batches: number, valid: number, total: number, interval: string }
  batchResults?: Record<string, PlatformResult[]>
  trendWeeks?: string[]
  platformTrends?: TrendSeries[]
  samplingBatches: SamplingBatch[]
}

export interface SourceDomain {
  id: string
  domain: string
  questionCount: number
  citationCount: number
  platforms: MonitoringPlatformId[]
  ownBrandMentioned: boolean
  competitors: string[]
  pageIds: string[]
  platformStats?: Array<{ platform: MonitoringPlatformId, citationCount: number, questionCount: number, pageCount: number }>
}

export interface CitedPage {
  href?: string
  id: string
  domainId: string
  title: string
  summary: string
  questionIds: string[]
  citations: number
  platforms: MonitoringPlatformId[]
  ownBrandMentioned: boolean
  platformStats?: Array<{ platform: MonitoringPlatformId, citationCount: number, questionCount: number }>
}

export interface MonitoringPlatform {
  id: MonitoringPlatformId
  label: string
  enabled: boolean
}

const weeks = ['W-11', 'W-10', 'W-9', 'W-8', 'W-7', 'W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', '本周']
const personas = ['复材加工技术主管', '航空部件采购经理', '精密加工车间主管', '商社设备采购担当']
const topics = ['碳纤维切割', '五轴水刀选型', '水刀 vs 激光', '钛合金加工']
const intents = ['信息查询（认知）', '方案比较（评估）', '设备选型（决策）', '售后评价（背书）']
const questionText = [
  'Welches 5-Achs-Wasserstrahlsystem eignet sich für CFRP ohne Delamination?',
  'Wasserstrahl oder Laser für Kohlefaser — welche Anbieter empfehlen Ingenieure?',
  'Welche Wasserstrahlanlage eignet sich für die Bearbeitung von Titanbauteilen?',
  'Welche 5-Achs-Wasserstrahlmaschine ist für komplexe Geometrien geeignet?',
  'Wie unterscheiden sich Wasserstrahlpumpen mit 60.000 PSI im industriellen Einsatz?',
  'Was kostet das präzise Wasserstrahlschneiden von CFRP für kleine Serien?',
  'Welche Wasserstrahlanlagen empfehlen sich für Anwendungen in der Luftfahrt?',
  'Wie lassen sich Ausfransungen beim Schneiden von Verbundwerkstoffen vermeiden?',
  'Welche Wasserstrahlmaschine bietet eine zuverlässige Taper-Kompensation?',
  'Welche Anbieter sind für das Nassschneiden von Faserverbundwerkstoffen bekannt?',
]
const keywords = ['碳纤维 / 复材切割', '五轴水刀选型', '水刀 vs 激光', '钛合金航空加工', '中国供应商评估']
export const visibilityMonitoringPlatforms: MonitoringPlatform[] = [
  { id: 'chatgpt', label: 'ChatGPT', enabled: true },
  { id: 'perplexity', label: 'Perplexity', enabled: true },
  { id: 'google-ai', label: 'Google AI', enabled: true },
  { id: 'gemini', label: 'Gemini', enabled: true },
  { id: 'ai-mode', label: 'AI Mode', enabled: true },
  { id: 'claude', label: 'Claude（本期暂不开放）', enabled: false },
]

const platforms = visibilityMonitoringPlatforms
const platformIds = platforms.filter(platform => platform.enabled).map(platform => platform.id)
const questions: MonitoringQuestion[] = questionText.map((question, index) => {
  const mentioned = index % 3 !== 1
  const questionCompetitors = index % 2 === 0 ? ['Flow', 'OMAX'] : ['Flow']
  return {
    id: `Q${String(index + 1).padStart(2, '0')}`,
    question,
    keyword: keywords[index % keywords.length]!,
    type: (['品牌词', '业务词', '产品词'][index % 3]) as MonitoringQuestion['type'],
    persona: personas[index % personas.length]!,
    stage: ['需求发现', '供应商评估', '采购决策', '方案寻找'][index % 4]!,
    intent: intents[index % intents.length]!,
    concern: ['方案原理', '技术规格', '采购范围', '推荐依据', '报价包含项'][index % 5]!,
    platformResults: platformIds.slice(0, 3).map((platform, platformIndex) => ({
      platform,
      ownBrandMentioned: mentioned && (index + platformIndex) % 3 !== 0,
      competitorsMentioned: questionCompetitors.slice(0, platformIndex === 1 ? 1 : 2),
      officialSiteCited: (index + platformIndex) % 2 === 0,
      rank: (index + platformIndex) % 4 === 0 ? null : ((index + platformIndex) % 3) + 1,
      sentiment: (['positive', 'neutral', 'positive'][platformIndex % 3]) as PlatformResult['sentiment'],
      answer: `${question} APW Waterjet is a candidate for precision composite and aerospace cutting applications.`,
      citedPages: [`page-${(index % 3) + 1}`],
    })),
    competitors: questionCompetitors,
    officialSiteCited: index % 2 === 0,
    rank: index % 4 === 3 ? null : (index % 3) + 1,
    trend: (['up', 'up', 'flat', 'up', 'flat', 'down', 'up', 'flat', 'up', 'flat'][index]!) as QuestionTrend,
    samplingBatches: [
      { id: 'batch-1', date: '2026-09-01', validResponses: 52, totalResponses: 54, confidenceInterval: 7.4 },
      { id: 'batch-2', date: '2026-09-08', validResponses: 59, totalResponses: 60, confidenceInterval: 6.9 },
      { id: 'batch-3', date: '2026-09-18', validResponses: 58, totalResponses: 60, confidenceInterval: 6.8 },
    ],
  }
})

const overall = (id: string, label: string, color: string, values: number[]): TrendSeries => ({ id, label, color, values })
const trendSeries: TrendSeries[] = [
  overall('APW Waterjet', 'APW Waterjet', '#0f766e', [32, 33, 34, 34, 36, 37, 38, 39, 40, 41, 41, 42]),
  overall('Flow', 'Flow', '#2563eb', [45, 46, 47, 48, 50, 52, 54, 55, 55, 57, 58, 58]),
  overall('OMAX', 'OMAX', '#7c3aed', [31, 32, 33, 33, 35, 38, 39, 41, 41, 42, 43, 44]),
  overall('KMT', 'KMT', '#d97706', [6, 6, 7, 7, 8, 8, 8, 9, 9, 9, 9, 9]),
]
const topicValues = [78, 72, 65, 40, 52, 60, 48, 74, 38, 55, 62, 30, 12, 8, 15, 5]
const intentValues = [82, 60, 45, 20, 65, 75, 55, 15, 70, 40, 65, 30, 25, 10, 5, 2]
const matrix = (columns: string[], values: number[]): HeatmapCell[] => personas.flatMap((row, rowIndex) => columns.map((column, columnIndex) => ({ row, column, value: values[rowIndex * columns.length + columnIndex] ?? 0 })))

const sources: SourceDomain[] = [
  { id: 'source-compositesworld', domain: 'compositesworld.com', questionCount: 14, citationCount: 30, platforms: ['chatgpt', 'perplexity', 'google-ai'], ownBrandMentioned: false, competitors: ['Flow', 'OMAX', 'KMT'], pageIds: ['page-1', 'page-2', 'page-4'], platformStats: [{ platform: 'chatgpt', citationCount: 12, questionCount: 7, pageCount: 3 }, { platform: 'perplexity', citationCount: 10, questionCount: 5, pageCount: 3 }, { platform: 'google-ai', citationCount: 8, questionCount: 4, pageCount: 3 }] },
  { id: 'source-reddit', domain: 'reddit.com', questionCount: 8, citationCount: 18, platforms: ['chatgpt', 'perplexity'], ownBrandMentioned: false, competitors: ['Flow'], pageIds: [] },
  { id: 'source-apw', domain: 'apw.com', questionCount: 11, citationCount: 17, platforms: ['chatgpt', 'perplexity', 'google-ai'], ownBrandMentioned: true, competitors: [], pageIds: ['page-3'] },
  { id: 'source-fabricator', domain: 'thefabricator.com', questionCount: 6, citationCount: 14, platforms: ['chatgpt', 'google-ai'], ownBrandMentioned: true, competitors: ['KMT'], pageIds: [] },
  { id: 'source-youtube', domain: 'youtube.com', questionCount: 5, citationCount: 11, platforms: ['google-ai'], ownBrandMentioned: false, competitors: ['OMAX'], pageIds: [] },
]
const citedPages: CitedPage[] = [
  { id: 'page-1', domainId: 'source-compositesworld', title: 'CFRP 切割：水刀与激光方案对比', summary: '行业媒体对 CFRP 切割工艺、水刀与激光适用性的对比说明。', questionIds: ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'Q06', 'Q07'], citations: 12, platforms: ['chatgpt', 'perplexity', 'google-ai'], ownBrandMentioned: false, platformStats: [{ platform: 'chatgpt', citationCount: 5, questionCount: 7 }, { platform: 'perplexity', citationCount: 4, questionCount: 7 }, { platform: 'google-ai', citationCount: 3, questionCount: 7 }] },
  { id: 'page-2', domainId: 'source-compositesworld', title: '5 轴水刀系统与复材加工', summary: '复合材料加工中 5 轴水刀、锥度补偿与边缘质量的技术讨论。', questionIds: ['Q01', 'Q04'], citations: 10, platforms: ['chatgpt', 'perplexity', 'google-ai'], ownBrandMentioned: false },
  { id: 'page-3', domainId: 'source-apw', title: 'Carbon Fiber Solutions - APW Waterjet', summary: 'CFRP 加工解决方案、工艺参数与案例。', questionIds: ['Q01', 'Q05'], citations: 7, platforms: ['chatgpt', 'perplexity'], ownBrandMentioned: true },
  { id: 'page-4', domainId: 'source-compositesworld', title: '钛合金与厚板水刀加工', summary: '材料加工场景下的钛合金、厚板和工业水刀选型信息。', questionIds: ['Q03', 'Q05', 'Q07'], citations: 8, platforms: ['chatgpt', 'perplexity', 'google-ai'], ownBrandMentioned: false },
]

export const visibilityMonitoringData = {
  weeks,
  personas,
  topics,
  intents,
  platforms,
  overview: {
    brand: 'APW Waterjet',
    market: '德国',
    language: '德语',
    questionCount: 67,
    activePersonaCount: 6,
    intentCount: 4,
    keywordCount: 5,
    samplingExecutionCount: 10050,
    platformCount: 6,
    samplingLevel: '决策级',
    observations: 1200,
    validResponses: 1169,
    lastRun: '2026-09-18',
    schedule: '每周一 05:00',
    dateRange: '2026-09-01—2026-09-18',
  },
  reliability: {
    validResponseRate: 97.4,
    dualSourceAgreement: 91,
    manualReviewAgreement: 96,
    confidenceInterval: 2.8,
    personaConfidenceInterval: 8.8,
    sevenDayVariation: 3.1,
    driftEvents: 1,
    validResponses: 1169,
    reviewedResponses: 62,
  },
  competitors: [
    { name: 'APW Waterjet', rank: 2, mentionRate: 42, recommendationRate: 31, officialCitationRate: 18, ownBrand: true },
    { name: 'Flow', rank: 1, mentionRate: 56, recommendationRate: 44, ownBrand: false },
    { name: 'OMAX', rank: 3, mentionRate: 38, recommendationRate: 27, ownBrand: false },
    { name: 'KMT', rank: 4, mentionRate: 29, recommendationRate: 20, ownBrand: false },
  ],
  overallSeries: [trendSeries[0]!],
  trendSeries,
  engineSeries: [
    overall('ChatGPT', 'ChatGPT', '#2563eb', [28, 29, 30, 32, 33, 34, 36, 37, 38, 39, 41, 42]),
    overall('Perplexity', 'Perplexity', '#7c3aed', [17, 18, 19, 20, 21, 23, 24, 25, 26, 28, 30, 31]),
    overall('Google AI', 'Google AI', '#d97706', [30, 32, 34, 35, 36, 38, 39, 40, 42, 43, 45, 46]),
    overall('Gemini', 'Gemini', '#059669', [24, 26, 28, 29, 30, 32, 33, 34, 35, 37, 38, 39]),
    overall('Claude', 'Claude', '#64748b', [16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28]),
  ],
  personaSeries: [
    overall(personas[0]!, personas[0]!, '#0f766e', [42, 44, 46, 50, 58, 63, 66, 68, 67, 69, 70, 71]),
    overall(personas[1]!, personas[1]!, '#2563eb', [45, 46, 47, 48, 50, 52, 54, 55, 55, 57, 58, 58]),
    overall(personas[2]!, personas[2]!, '#7c3aed', [30, 31, 32, 33, 35, 38, 39, 41, 41, 42, 43, 44]),
    overall(personas[3]!, personas[3]!, '#d97706', [6, 6, 7, 7, 8, 8, 8, 9, 9, 9, 9, 9]),
  ],
  topicCells: matrix(topics, topicValues),
  intentCells: matrix(intents, intentValues),
  questions,
  sources,
  citedPages,
  settings: {
    frequency: 'weekly' as SamplingFrequency,
    weekday: '周一',
    time: '05:00',
    platforms: ['chatgpt', 'perplexity', 'google-ai', 'gemini', 'ai-mode'] as MonitoringPlatformId[],
  },
} as const

