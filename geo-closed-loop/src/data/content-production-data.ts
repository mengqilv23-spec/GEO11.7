import type {
  ContentVerificationCitation,
  ContentVerificationQuestion,
  PlatformVerificationAnswer,
} from './content-verification-data'
import type { MonitoringPlatformId } from './visibility-monitoring-data'
import { contentVerificationItems } from './content-verification-data'
import { publishedContentTasks } from './published-content-tasks'
import { referenceMonitoringResults } from './reference-monitoring-results'

export type ContentProductionStage
  = | 'draft'
    | 'ai_checked'
    | 'pending_client'
    | 'client_rejected'
    | 'ready_to_publish'
    | 'questions_pending'
    | 'questions_confirmed'
    | 'verifying'
    | 'verified'

export type ContentProductionSource = 'ai' | 'upload' | 'imported'
export type AiCheckStatus = 'pass' | 'warn'
export type ClientConfirmationStatus = 'pending' | 'confirmed' | 'rejected'

export interface AiCheckItem {
  key: string
  label: string
  status: AiCheckStatus
  detail: string
}

export interface AiCheckResult {
  checkedAt: string
  passed: boolean
  items: AiCheckItem[]
}

export interface ClientConfirmation {
  status: ClientConfirmationStatus
  at?: string
  comment?: string
}

export interface ContentBrief {
  theme: string
  targetQuestion: string
  audience: string
  market: string
  notes: string
}

export interface ProductionQuestion extends ContentVerificationQuestion {
  confirmed: boolean
}

export interface ContentProductionItem {
  id: string
  taskId?: string
  title: string
  slug: string
  summary: string
  body: string
  keyFacts: string[]
  brief: ContentBrief
  stage: ContentProductionStage
  source: ContentProductionSource
  createdAt: string
  updatedAt: string
  publishedAt?: string
  url?: string
  revision: number
  aiCheck?: AiCheckResult
  clientConfirmation?: ClientConfirmation
  questions: ProductionQuestion[]
  /** Questions offered for the single verification question of this article. */
  questionCandidates?: string[]
  roundId?: string
  lastChecked?: string
}

export interface BlogDraftInput {
  theme: string
  targetQuestion: string
  audience: string
  market: string
  notes: string
  keyFacts: string[]
}

export interface BlogDraft {
  title: string
  slug: string
  summary: string
  body: string
}

export interface ContentProductionSummary {
  monthlyLimit: number
  published: number
  publishedThisMonth: number
  inProgress: number
  pendingQuestions: number
  verified: number
  remaining: number
  exhausted: boolean
  resetLabel: string
}

const brand = 'APW Waterjet'
const platformLabels = new Map(referenceMonitoringResults.platforms.map(platform => [platform.id, platform.label]))
const enabledPlatforms = referenceMonitoringResults.platforms.filter(platform => platform.enabled).map(platform => platform.id)

const stageLabels: Record<ContentProductionStage, string> = {
  draft: '草稿',
  ai_checked: 'AI 检查完成',
  pending_client: '待客户确认',
  client_rejected: '客户已驳回',
  ready_to_publish: '待发布',
  questions_pending: '待确认问题',
  questions_confirmed: '待核验',
  verifying: '核验中',
  verified: '已核验',
}

const stageDescriptions: Record<ContentProductionStage, string> = {
  draft: 'AI 初稿已生成，等待运营编辑和检查。',
  ai_checked: 'AI 检查已完成，可提交客户确认。',
  pending_client: '内容已提交客户，等待客户确认或驳回。',
  client_rejected: '客户已驳回，修改后可重新提交。',
  ready_to_publish: '客户已确认，可以发布到官网 Blog。',
  questions_pending: '内容已发布，等待运营选择核验问题。',
  questions_confirmed: '问题已确认，内容发布满 48 小时后可以开始核验。',
  verifying: '正在调用 AI 平台执行核验。',
  verified: '核验已完成，可以查看 AI 回答与官网引用。',
}

/** AI 平台收录新内容需要时间，发布后满 48 小时才能开始核验。 */
export const VERIFICATION_COOLDOWN_HOURS = 48

export function verificationAvailableAt(publishedAt?: string): Date | null {
  if (!publishedAt)
    return null
  const time = new Date(publishedAt).getTime()
  if (Number.isNaN(time))
    return null
  return new Date(time + VERIFICATION_COOLDOWN_HOURS * 60 * 60 * 1000)
}

export function canVerifyContent(item: Pick<ContentProductionItem, 'publishedAt'>, now = new Date()): boolean {
  const availableAt = verificationAvailableAt(item.publishedAt)
  return Boolean(availableAt && now >= availableAt)
}

const clientStageDescriptions: Record<ContentProductionStage, string> = {
  draft: '专家正在准备内容，提交后会请您确认。',
  ai_checked: '专家正在准备内容，提交后会请您确认。',
  pending_client: '内容已提交，请确认内容与发布范围。',
  client_rejected: '您已驳回，专家修改后会重新提交。',
  ready_to_publish: '您已确认，等待专家发布到官网 Blog。',
  questions_pending: '内容已发布，专家正在选择核验问题。',
  questions_confirmed: '核验问题已确认，内容生效后由专家执行核验。',
  verifying: '专家正在执行核验。',
  verified: '核验已完成，可查看 AI 回答与官网引用。',
}

export function stageLabel(stage: ContentProductionStage) {
  return stageLabels[stage]
}

export function stageDescription(stage: ContentProductionStage) {
  return stageDescriptions[stage]
}

/** Customer-facing copy: no internal production actions are implied. */
export function clientStageDescription(stage: ContentProductionStage) {
  return clientStageDescriptions[stage]
}

export function sourceLabel(source: ContentProductionSource) {
  return source === 'ai' ? 'AI 写稿' : source === 'upload' ? '客户上传' : '已发布导入'
}

/** Table status and filter tabs share these four workflow groups. */
export type ContentProductionGroup = 'active' | 'client' | 'verify' | 'verified'

const stageGroups: Record<ContentProductionStage, ContentProductionGroup> = {
  draft: 'active',
  ai_checked: 'active',
  client_rejected: 'active',
  ready_to_publish: 'active',
  pending_client: 'client',
  questions_pending: 'verify',
  questions_confirmed: 'verify',
  verifying: 'verify',
  verified: 'verified',
}

const groupLabels: Record<ContentProductionGroup, string> = {
  active: '进行中',
  client: '待客户确认',
  verify: '待核验',
  verified: '已核验',
}

export function contentStageGroup(stage: ContentProductionStage): ContentProductionGroup {
  return stageGroups[stage]
}

export function contentStageGroupLabel(stage: ContentProductionStage): string {
  return groupLabels[stageGroups[stage]]
}

export function isInCurrentMonth(value: string, now = new Date()) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return false
  const { start, end } = currentMonthRange(now)
  return date >= start && date < end
}

export function currentMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start, end }
}

export function nextMonthResetLabel(now = new Date()) {
  const { end } = currentMonthRange(now)
  return `${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
}

export function monthlyContentLimitForPlan(planCode?: string | null, planName?: string | null) {
  const plan = `${planCode ?? ''} ${planName ?? ''}`.toLocaleLowerCase()
  if (/starter|basic|入门|初级/.test(plan))
    return 10
  if (/enterprise|高级/.test(plan))
    return 30
  return 20
}

export function contentProductionSummary(
  items: ContentProductionItem[],
  monthlyLimit: number,
  now = new Date(),
): ContentProductionSummary {
  const publishedThisMonth = items.filter(item => item.publishedAt && isInCurrentMonth(item.publishedAt, now)).length
  // With one selected question per article, "pending" means the article is
  // published but the operator has not chosen its verification question yet.
  const pendingQuestions = items.filter(item => item.stage === 'questions_pending').length
  return {
    monthlyLimit,
    published: items.filter(item => Boolean(item.publishedAt)).length,
    publishedThisMonth,
    inProgress: items.filter(item => item.stage !== 'verified').length,
    pendingQuestions,
    verified: items.filter(item => item.stage === 'verified').length,
    remaining: Math.max(0, monthlyLimit - publishedThisMonth),
    exhausted: publishedThisMonth >= monthlyLimit,
    resetLabel: nextMonthResetLabel(now),
  }
}

export function buildBlogDraft(input: BlogDraftInput): BlogDraft {
  const theme = input.theme.trim()
  const title = /^APW/i.test(theme) ? theme : `APW ${theme}`
  const facts = input.keyFacts.length ? input.keyFacts : ['工艺参数需结合材料与设备配置确认']
  const audience = input.audience.trim() || '工业制造企业的技术与采购团队'
  const market = input.market.trim() || '目标市场'
  const notes = input.notes.trim() || '具体参数、交期与服务范围需结合项目确认。'
  return {
    title,
    slug: slugFromTitle(title),
    summary: `面向${audience}，说明${theme}的关键事实、适用场景与确认边界。`,
    body: [
      `<h2>${escapeHtml(theme)}</h2>`,
      `<p>${brand}围绕${escapeHtml(theme)}提供可被 AI 引用的官网说明。核心事实包括：${escapeHtml(facts.join('、'))}。</p>`,
      `<h2>适用场景</h2>`,
      `<p>面向${escapeHtml(audience)}，在${escapeHtml(market)}市场用于回答“${escapeHtml(input.targetQuestion || theme)}”这类问题。页面内容以已确认的产品能力、材料范围和工艺边界为准。</p>`,
      `<h2>确认边界</h2>`,
      `<p>${escapeHtml(notes)}</p>`,
    ].join(''),
  }
}

export function runAiCheckFor(item: Pick<ContentProductionItem, 'title' | 'body' | 'keyFacts' | 'brief'>): AiCheckResult {
  const items: AiCheckItem[] = [
    {
      key: 'brand',
      label: '品牌口径',
      status: new RegExp(brand, 'i').test(item.body) ? 'pass' : 'warn',
      detail: new RegExp(brand, 'i').test(item.body) ? `正文包含品牌名 ${brand}。` : `正文未出现品牌名 ${brand}。`,
    },
    {
      key: 'structure',
      label: 'Blog 结构',
      status: /<h2/i.test(item.body) ? 'pass' : 'warn',
      detail: /<h2/i.test(item.body) ? '包含标题层级和小节结构。' : '建议补充 H2 小节，方便 AI 提取。',
    },
    {
      key: 'claims',
      label: '承诺边界',
      status: /保证|永久|100%|最低价/.test(item.body) ? 'warn' : 'pass',
      detail: /保证|永久|100%|最低价/.test(item.body) ? '发现绝对化承诺，发布前需人工确认。' : '未发现绝对化承诺。',
    },
  ]
  return {
    checkedAt: new Date().toISOString(),
    passed: items.every(item => item.status === 'pass'),
    items,
  }
}

/**
 * 一篇已发布文章只核验一个问题。AI 先给出 5 个候选，运营从中选 1 个，
 * 或直接写自己的问题。
 */
export function generateQuestionCandidates(source: Pick<ContentProductionItem, 'title' | 'keyFacts' | 'brief'>): string[] {
  const theme = source.brief.theme.trim() || source.title
  const facts = source.keyFacts.length ? source.keyFacts : [theme]
  const market = source.brief.market.trim() || '目标市场'
  const candidates = [
    source.brief.targetQuestion.trim(),
    `${brand} 是否提供${facts[0]}相关能力？`,
    `${brand} 的${facts[0]}能力适用于哪些场景？`,
    `${brand} 如何控制${facts[0]}的加工质量？`,
    `${brand} 在${market}提供哪些${facts[0]}相关的服务支持？`,
    `${brand} 对${facts.at(-1)}有哪些说明？`,
    `${brand} 的${facts[0]}与同类方案相比有哪些差异？`,
  ].filter(Boolean)
  return [...new Set(candidates)].slice(0, 5)
}

export function createVerificationQuestion(itemId: string, question: string): ProductionQuestion {
  return {
    id: `${itemId}-Q1`,
    question,
    intent: '',
    state: 'pending',
    answers: [],
    citationCount: 0,
    primaryCitationCount: 0,
    confirmed: true,
  }
}

export function verifyQuestion(
  item: Pick<ContentProductionItem, 'title' | 'url' | 'summary' | 'keyFacts' | 'brief'>,
  question: ProductionQuestion,
): ProductionQuestion {
  const answers = item.url ? buildMockVerificationAnswers(item, question) : []
  const primaryCitationCount = answers.reduce((count, answer) => count + answer.citations.filter(citation => citation.isPrimary).length, 0)
  const citationCount = answers.reduce((count, answer) => count + answer.citations.length, 0)
  return {
    ...question,
    answers,
    citationCount,
    primaryCitationCount,
    state: primaryCitationCount > 0 ? 'cited' : 'pending',
  }
}

export function buildMockVerificationAnswers(
  item: Pick<ContentProductionItem, 'title' | 'url' | 'summary' | 'keyFacts' | 'brief'>,
  question: ProductionQuestion,
): PlatformVerificationAnswer[] {
  const url = item.url
  if (!url)
    return []
  const platforms = enabledPlatforms.length ? enabledPlatforms.slice(0, 2) : ['chatgpt' as MonitoringPlatformId]
  const facts = item.keyFacts.length ? item.keyFacts.join('、') : item.brief.theme
  return platforms.map((platform, index) => {
    const citation: ContentVerificationCitation = {
      key: `${url}-${platform}-${question.id}`,
      title: item.title,
      url,
      domain: domainOf(url),
      excerpt: index === 0 ? item.summary : `${item.title} 说明了${facts}以及相关服务边界。`,
      isPrimary: true,
    }
    const platformLabel = platformLabels.get(platform) ?? platform
    const answer = `${item.title} 提到，${brand} 在${item.brief.theme}场景下覆盖${facts}。官网 Blog 提供了相关说明：${url}`
    return {
      platform,
      platformLabel,
      state: 'cited',
      answer,
      htmlSnapshot: `<!DOCTYPE html><html><head><title>${platformLabel} · ${question.question}</title></head><body><p>${answer}</p><p><a href="${url}">${url}</a></p></body></html>`,
      citations: [citation],
    }
  })
}

export function createPublishedVerificationItems(): ContentProductionItem[] {
  return contentVerificationItems.map((item) => {
    const sourceTask = publishedContentTasks.find(task => task.id === item.taskId)
    return {
      id: item.taskId,
      taskId: item.taskId,
      title: item.contentTitle,
      slug: slugFromUrl(item.url),
      summary: item.summary,
      body: sourceTask?.workflow?.output.body ?? `<h2>${item.contentTitle}</h2><p>${item.summary}</p>`,
      keyFacts: [...item.keyFacts],
      brief: {
        theme: item.taskName,
        targetQuestion: item.questions[0]?.question ?? '',
        audience: '官网访客与采购团队',
        market: '德国',
        notes: '使用客户终审版本；不得扩写未经确认的价格、交期、认证和服务承诺。',
      },
      stage: 'verified' as const,
      source: 'imported' as const,
      createdAt: item.publishedAt,
      updatedAt: item.publishedAt,
      publishedAt: item.publishedAt,
      url: item.url,
      revision: item.revision,
      aiCheck: passedAiCheck(item.publishedAt),
      clientConfirmation: { status: 'confirmed' as const, at: item.publishedAt, comment: '已发布内容导入。' },
      questions: item.questions.map(question => ({ ...question, confirmed: true })),
      roundId: item.roundId,
      lastChecked: item.lastChecked,
    }
  })
}

export function createSeedProductionItems(now = new Date()): ContentProductionItem[] {
  const existing = createPublishedVerificationItems()

  const pendingBrief: ContentBrief = {
    theme: '五轴水刀 · CFRP 分层控制指南',
    targetQuestion: 'APW 如何控制 CFRP 切割分层？',
    audience: '航空复材加工技术主管',
    market: '德国',
    notes: '分层、锥度与表面粗糙度需结合材料、设备配置与测试条件确认；不承诺未经验证的交期。',
  }
  const pendingFacts = ['五轴磨料水刀', 'CFRP 分层控制', 'Ra ≤ 3.2 µm', '无热影响区']
  const pendingDraft = buildBlogDraft({ ...pendingBrief, keyFacts: pendingFacts })
  const pendingItem: ContentProductionItem = {
    id: 'CV-2601',
    title: pendingDraft.title,
    slug: pendingDraft.slug,
    summary: pendingDraft.summary,
    body: pendingDraft.body,
    keyFacts: pendingFacts,
    brief: pendingBrief,
    stage: 'pending_client',
    source: 'ai',
    createdAt: daysAgo(now, 3),
    updatedAt: daysAgo(now, 1),
    revision: 1,
    aiCheck: runAiCheckFor({
      title: pendingDraft.title,
      body: pendingDraft.body,
      keyFacts: pendingFacts,
      brief: pendingBrief,
    }),
    clientConfirmation: { status: 'pending' },
    questions: [],
  }

  const publishedBrief: ContentBrief = {
    theme: '水刀 vs 激光 · 航空复材切割选型',
    targetQuestion: '航空复材切割应该选水刀还是激光？',
    audience: '航空部件采购经理',
    market: '德国',
    notes: '适用性取决于材料、厚度、精度和成本要求，具体方案需结合项目确认。',
  }
  const publishedFacts = ['冷切割', '无热影响区', '边缘质量', '适用厚度与场景']
  const publishedDraft = buildBlogDraft({ ...publishedBrief, keyFacts: publishedFacts })
  const publishedItem: ContentProductionItem = {
    id: 'CV-2602',
    title: publishedDraft.title,
    slug: 'waterjet-vs-laser-aerospace',
    summary: publishedDraft.summary,
    body: publishedDraft.body,
    keyFacts: publishedFacts,
    brief: publishedBrief,
    stage: 'questions_pending',
    source: 'ai',
    createdAt: daysAgo(now, 5),
    updatedAt: daysAgo(now, 1),
    publishedAt: daysAgo(now, 1),
    url: 'https://apw.com/blog/waterjet-vs-laser-aerospace',
    revision: 1,
    aiCheck: runAiCheckFor({
      title: publishedDraft.title,
      body: publishedDraft.body,
      keyFacts: publishedFacts,
      brief: publishedBrief,
    }),
    clientConfirmation: { status: 'confirmed', at: daysAgo(now, 2), comment: '客户确认发布。' },
    questions: [],
    questionCandidates: generateQuestionCandidates({
      title: publishedDraft.title,
      keyFacts: publishedFacts,
      brief: publishedBrief,
    }),
  }

  return [pendingItem, publishedItem, ...existing]
}

function passedAiCheck(at: string): AiCheckResult {
  return {
    checkedAt: at,
    passed: true,
    items: [
      { key: 'brand', label: '品牌口径', status: 'pass', detail: `正文包含品牌名 ${brand}。` },
      { key: 'structure', label: 'Blog 结构', status: 'pass', detail: '包含标题层级和小节结构。' },
      { key: 'claims', label: '承诺边界', status: 'pass', detail: '未发现绝对化承诺。' },
    ],
  }
}

function daysAgo(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

function slugFromTitle(title: string) {
  const ascii = title
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return ascii || `blog-${Date.now().toString(36)}`
}

function slugFromUrl(value: string) {
  try {
    return new URL(value).pathname.split('/').filter(Boolean).at(-1) ?? 'blog'
  }
  catch {
    return 'blog'
  }
}

function domainOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  }
  catch {
    return 'apw.com'
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}
