import type { ReportDetailBundle, ReportListItem } from '../api/reports'
import type { ReportRecord, ReportType } from './report-center-data'
import type { ReportDetailProfile } from './report-detail-data'

const reportTypeMap: Record<ReportListItem['reportType'], ReportType> = {
  weekly: 'weekly',
  monthly: 'monthly',
  quarterly: 'quarterly',
  latest: 'adhoc',
}

function datePart(value: string | undefined): string {
  return value?.slice(0, 10) ?? ''
}

function formatPeriod(start: string, end: string): string {
  const from = datePart(start)
  const to = datePart(end)
  if (!from)
    return to
  return from === to ? from : `${from}—${to}`
}

function parseTags(value: string): string[] {
  if (!value)
    return []
  try {
    const tags: unknown = JSON.parse(value)
    return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : []
  }
  catch {
    return []
  }
}

export function mapReportListItem(item: ReportListItem): ReportRecord {
  const date = datePart(item.createTime) || datePart(item.periodEnd) || datePart(item.periodStart)
  const status = ({ 0: 'generating', 1: 'generated', 2: 'failed', 3: 'archived' } as const)[item.status] ?? 'outline'
  return {
    id: String(item.reportId),
    type: reportTypeMap[item.reportType],
    title: item.reportName || '监测报告',
    period: formatPeriod(item.periodStart, item.periodEnd),
    date,
    summary: item.reportFocus?.trim() || '',
    tags: parseTags(item.reportTags),
    sections: [],
    questionIds: [],
    status,
    empty: item.empty,
    scopeSummary: item.scopeSummary,
  }
}

function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? '—' : `${value}%`
}

function formatDelta(value: number | null): string {
  if (value === null || !Number.isFinite(value))
    return '本次结果'
  return `${value > 0 ? '+' : ''}${value}pp`
}

function narrativeTitle(sceneCode: string, part: string): string {
  if (sceneCode === 'analysis_four_cards') {
    return ({ c1: '整体位置与当前短板', c2: '平台拆解', c3: '人设与意图拆解', c4: '来源关联' } as Record<string, string>)[part] ?? '关键发现'
  }
  const titles: Record<string, string> = {
    summary_lead_copy: '本次总体结果',
    comp_insight: '竞品表现',
    gap_takeaway_platform: '平台差距',
    gap_takeaway_persona_intent: '人设与意图',
    gap_takeaway_source: '来源表现',
    analysis_four_cards: '关键发现',
  }
  return titles[sceneCode] ?? sceneCode
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sourceRows(data: Record<string, unknown>): Array<Record<string, unknown>> {
  const page = isRecord(data.page) ? data.page : undefined
  const candidates = [data.records, data.domains, data.pages, data.list, page?.records]
  const rows = candidates.find(Array.isArray)
  return Array.isArray(rows) ? rows.filter(isRecord) : []
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function formatPlatformList(value: unknown): string {
  let platforms: unknown[]
  if (Array.isArray(value)) {
    platforms = value
  }
  else if (typeof value === 'string' && value.trim()) {
    const raw = value.trim()
    try {
      const parsed: unknown = JSON.parse(raw)
      platforms = Array.isArray(parsed) ? parsed : [parsed]
    }
    catch {
      platforms = raw.split(/[、，,|/]/)
    }
  }
  else {
    return '—'
  }

  const labels: Record<string, string> = {
    chatgpt: 'ChatGPT',
    gemini: 'Gemini',
    perplexity: 'Perplexity',
    googleai: 'Google AI',
    googleaioverviews: 'Google AI Overviews',
    claude: 'Claude',
  }
  const normalized = platforms
    .filter((platform): platform is string => typeof platform === 'string')
    .map(platform => platform.trim())
    .filter(Boolean)
    .map((platform) => {
      const key = platform.toLowerCase().replace(/[\s_-]+/g, '')
      return labels[key] ?? platform
    })

  return [...new Set(normalized)].join(' · ') || '—'
}

function formatCompetitorNames(value: unknown): string {
  let names: unknown = value
  if (typeof value === 'string') {
    const raw = value.trim()
    if (!raw)
      return '—'
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed))
        names = parsed
      else if (typeof parsed === 'string')
        return parsed.trim() || '—'
      else
        return raw
    }
    catch {
      return raw
    }
  }
  if (!Array.isArray(names))
    return typeof names === 'number' ? String(names) : '—'

  const formatted = names
    .filter((name): name is string => typeof name === 'string')
    .map(name => name.trim())
    .filter(Boolean)
  return [...new Set(formatted)].join('、') || '—'
}

function yesNoValue(value: unknown): string {
  if (value === 1 || value === true || value === '1' || value === 'true')
    return '是'
  if (value === 0 || value === false || value === '0' || value === 'false')
    return '否'
  return '—'
}

function pivotCompetitorCells(cells: ReportDetailBundle['competitors']['platformMatrix']) {
  const dimensions = new Map<string, Record<string, { value: string, numerator: number | null, denominator: number | null }>>()
  const mentionCells = cells.filter(cell => /mention|soa/i.test(cell.metricCode))
  for (const cell of mentionCells.length ? mentionCells : cells) {
    const values = dimensions.get(cell.dimValue) ?? {}
    values[cell.brandName] = {
      value: formatPercent(cell.value),
      numerator: cell.numerator,
      denominator: cell.denominator,
    }
    dimensions.set(cell.dimValue, values)
  }
  return [...dimensions].map(([dimension, values]) => ({ dimension: dimension.replaceAll('::', ' × '), values }))
}

function splitPersonaTheme(value: string): { persona: string, theme: string } {
  const [persona, theme] = value.split('::', 2)
  return { persona: persona?.trim() ?? '', theme: theme?.trim() ?? '' }
}

function questionPlatformSummary(value: string, fallbackPlatform: string, rankValue: number | null, rankTotal: number | null): string {
  const platformLabels: Record<string, string> = {
    chatgpt: 'ChatGPT',
    gemini: 'Gemini',
    perplexity: 'Perplexity',
    googleai: 'Google AI',
    googleaioverviews: 'Google AI Overviews',
    claude: 'Claude',
  }
  const platformLabel = (name: string) => platformLabels[name.toLowerCase().replace(/[\s_-]+/g, '')] ?? name
  const fallback = fallbackPlatform
    ? `${platformLabel(fallbackPlatform)}${rankValue == null ? '' : `：第 ${rankValue} 位${rankTotal == null ? '' : ` / ${rankTotal}`}`}`
    : ''
  if (!value.trim())
    return fallback || '—'

  try {
    const parsed: unknown = JSON.parse(value)
    const records = Array.isArray(parsed)
      ? parsed.filter(isRecord).map(item => [stringValue(item.platform, stringValue(item.platformName, stringValue(item.name))), item])
      : isRecord(parsed)
        ? Object.entries(parsed).map(([name, item]) => [name, isRecord(item) ? item : { value: item }])
        : []
    const summaries = records.map(([name, item]) => {
      const rawPlatform = stringValue(name)
      const platform = platformLabel(rawPlatform)
      if (!platform || !isRecord(item))
        return ''
      const mentioned = item.isMentioned === 0 || item.isMentioned === false || item.mentioned === false
      const rank = item.rankValue ?? item.rank ?? item.position
      if (mentioned)
        return `${platform}：未提及`
      return `${platform}${typeof rank === 'number' ? `：第 ${rank} 位${typeof item.rankTotal === 'number' ? ` / ${item.rankTotal}` : ''}` : ''}`
    }).filter(Boolean)
    return summaries.join(' · ') || fallback || '—'
  }
  catch {
    return fallback || '—'
  }
}

export function mapReportDetailBundle(bundle: ReportDetailBundle): ReportDetailProfile {
  const { detail, metrics, platforms, questions, sources, sourcePages, evidence, competitors } = bundle
  const header = detail.header
  const overallMetrics = metrics.filter(metric => metric.dimensionType === 'overall')
  const primaryMetricMatchers = [
    /mention_rate|品牌提及率|\bsoa\b/i,
    /recommend(?:ation)?_rate|品牌推荐率/i,
    /citation_rate|官网引用率/i,
    /sov_rate|声量份额|\bsov\b/i,
  ]
  const displayMetrics = primaryMetricMatchers.flatMap((matcher) => {
    const metric = overallMetrics.find(item => matcher.test(`${item.metricCode} ${item.metricName}`))
    return metric ? [metric] : []
  })
  const mappedMetrics = displayMetrics.map((metric) => {
    const value = metric.value
    const sampleCount = metric.sampleCount ?? metric.denominator
    const confidence = metric.confidenceLow !== null && metric.confidenceHigh !== null
      ? `，95% 区间 ${metric.confidenceLow}–${metric.confidenceHigh}`
      : ''
    return {
      label: metric.metricName || metric.metricCode,
      value: metric.unit === 'percent' ? formatPercent(value) : value === null ? '—' : String(value),
      delta: formatDelta(metric.changeValue),
      baseline: metric.previousValue === null ? '—' : formatPercent(metric.previousValue),
      note: `${sampleCount === null ? '暂无样本数' : `有效样本 ${sampleCount}`}${confidence}`,
    }
  })
  if (!mappedMetrics.some(metric => /SOV|声量份额/i.test(metric.label)) && detail.ribbon.sovRate !== null) {
    mappedMetrics.push({ label: '声量份额（SOV）', value: formatPercent(detail.ribbon.sovRate), delta: '本次结果', baseline: '—', note: '本次监测快照' })
  }

  const summaryLead = detail.narratives.find(item => item.sceneCode === 'summary_lead_copy' && item.part === 'lead')?.contentText.trim() ?? ''
  const summaryCopy = detail.narratives.find(item => item.sceneCode === 'summary_lead_copy' && item.part === 'copy')?.contentText.trim() ?? ''
  const narrativeHighlights = detail.narratives
    .filter(item => item.contentText.trim() && item.sceneCode === 'analysis_four_cards')
    .map(item => ({ title: narrativeTitle(item.sceneCode, item.part), description: item.contentText }))
  const highlights = narrativeHighlights.length
    ? narrativeHighlights
    : header.summary ? [{ title: '本次总体结果', description: header.summary }] : []
  const personaMetrics = metrics.filter(metric => metric.dimensionType === 'persona')
  const intentMetrics = metrics.filter(metric => metric.dimensionType === 'intent')
  const personaThemeMetrics = metrics.filter(metric => metric.dimensionType === 'persona_theme').map((metric) => {
    const parsed = splitPersonaTheme(metric.dimensionValue)
    let theme = parsed.theme
    try {
      const extra = JSON.parse(metric.extraJson) as { themeName?: unknown }
      theme = stringValue(extra.themeName, theme)
    }
    catch {
      // Some deployments return non-JSON extension data; the dimension snapshot remains usable.
    }
    return { persona: parsed.persona, theme, value: formatPercent(metric.value) }
  })
  const sourceData = sourceRows(sources)
  const sourcePageData = sourceRows(sourcePages).map(source => ({
    title: stringValue(source.pageTitle, stringValue(source.title, '被引页面')),
    domain: stringValue(source.domain, '—'),
    citations: String(source.citationCount ?? source.citations ?? 0),
    url: stringValue(source.pageUrl, stringValue(source.url)),
    questionCount: String(source.questionCount ?? source.hitQuestionCount ?? '—'),
    platforms: formatPlatformList(source.platforms),
    ourMentioned: yesNoValue(source.isOurMentioned ?? source.ourMentioned),
    competitors: formatCompetitorNames(source.competitorNames),
  }))
  const sourcePageUrls = new Set(sourcePageData.map(source => source.url).filter(Boolean))
  for (const source of competitors.sourceCooccurrence) {
    if (source.pageUrl && sourcePageUrls.has(source.pageUrl))
      continue
    sourcePageData.push({
      title: source.pageTitle || source.pageUrl || '被引页面',
      domain: source.domain || '—',
      citations: String(source.citationCount),
      url: source.pageUrl,
      questionCount: '—',
      platforms: formatPlatformList(source.platforms),
      ourMentioned: yesNoValue(source.isOurMentioned),
      competitors: formatCompetitorNames(source.competitorNames),
    })
  }

  return {
    type: header.reportType === 'latest' ? 'adhoc' : header.reportType,
    label: header.reportType === 'latest' ? '次报' : ({ weekly: '周报', monthly: '月报', quarterly: '季报' }[header.reportType]),
    title: header.reportName || '监测报告',
    date: datePart(header.periodEnd) || datePart(header.periodStart),
    cycle: formatPeriod(header.periodStart, header.periodEnd),
    cadence: header.monitorCadence,
    comparison: '本次监测结果',
    focus: summaryCopy || header.summary || highlights[0]?.description || '',
    summaryLead,
    summaryCopy,
    status: ({ 0: 'generating', 1: 'generated', 2: 'failed', 3: 'archived' } as const)[header.status] ?? 'outline',
    metrics: mappedMetrics,
    highlights,
    platforms: platforms.map(platform => ({
      name: platform.platform,
      mention: formatPercent(platform.mentionRate),
      citations: formatPercent(platform.citationRate),
      sample: `有效回答 ${platform.validAnswerCount}/${platform.sampleCount}`,
      movement: platform.mentionVsPrevPp === null ? '本次结果' : formatDelta(platform.mentionVsPrevPp),
      displayStatus: platform.displayStatus,
      avgRank: platform.avgRank === null ? '—' : String(platform.avgRank),
    })),
    personas: personaMetrics.map(metric => ({
      name: metric.dimensionValue,
      mention: formatPercent(metric.value),
      confidence: metric.confidenceLow !== null && metric.confidenceHigh !== null
        ? `${metric.confidenceLow}–${metric.confidenceHigh}`
        : '暂无区间数据',
    })),
    personaThemeMatrix: personaThemeMetrics,
    intentMetrics: intentMetrics.map(metric => ({
      name: metric.dimensionValue || metric.metricName || metric.metricCode,
      value: formatPercent(metric.value),
      sample: metric.sampleCount === null ? '—' : String(metric.sampleCount),
    })),
    questions: questions.records.map(question => ({
      question: question.questionText,
      persona: question.personaName,
      platforms: questionPlatformSummary(question.platformDetailJson, question.platform, question.rankValue, question.rankTotal),
      officialEvidence: question.isOfficialCited === 1 ? '是' : '否',
      trend: question.changeType || question.trendDirection,
      answer: question.answerText,
      rank: question.rankValue == null || !Number.isFinite(question.rankValue)
        ? '—'
        : `第 ${question.rankValue} 位${question.rankTotal == null || !Number.isFinite(question.rankTotal) ? '' : ` / ${question.rankTotal}`}`,
      sample: question.validAnswerCount != null && question.sampleCount != null
        && Number.isFinite(question.validAnswerCount) && Number.isFinite(question.sampleCount)
        ? `${question.validAnswerCount}/${question.sampleCount}`
        : '—',
      confidence: question.confidenceLow != null && question.confidenceHigh != null
        && Number.isFinite(question.confidenceLow) && Number.isFinite(question.confidenceHigh)
        ? `±${((question.confidenceHigh - question.confidenceLow) / 2).toFixed(1)}pp`
        : '—',
    })),
    sources: sourceData.map(source => ({
      domain: stringValue(source.domain, stringValue(source.pageTitle, '来源')),
      citations: String(source.citationCount ?? source.citations ?? 0),
      answers: String(source.questionCount ?? source.hitQuestionCount ?? source.answerCount ?? source.answers ?? '—'),
      platforms: formatPlatformList(source.platforms),
      ourMentioned: yesNoValue(source.isOurMentioned ?? source.ourMentioned),
    })),
    sourcePages: sourcePageData,
    recommendations: [],
    scopeSummary: header.scopeSummary,
    personaCount: header.personaCount,
    intentCount: header.intentCount,
    keywordCount: header.keywordCount,
    questionCount: header.questionCount,
    platformCount: header.platformCount,
    trendPoints: detail.trendPoints.map(point => ({
      date: point.monitorDate,
      value: point.value,
      metricCode: point.metricCode,
      roundId: point.roundId,
      ciLow: point.ciLow,
      ciHigh: point.ciHigh,
      sort: point.sort,
    })),
    competitorRanks: competitors.overallRanks.map(rank => ({
      name: rank.brandName,
      mention: formatPercent(rank.mentionRate),
      recommend: formatPercent(rank.recommendRate),
      citation: formatPercent(rank.citationRate),
      rank: rank.rank,
      isOwn: rank.ownBrand,
    })),
    competitorSummary: competitors.summaryText || competitors.positioning,
    competitorNarratives: Object.values(competitors.narrative).filter(text => text.trim()),
    ribbon: {
      sovRate: formatPercent(detail.ribbon.sovRate),
      headCompetitor: detail.ribbon.competitorGap.headCompetitor,
      ownRank: detail.ribbon.competitorGap.ownRank === null ? '—' : String(detail.ribbon.competitorGap.ownRank),
      mentionGap: detail.ribbon.competitorGap.mentionGap,
      recommendGap: detail.ribbon.competitorGap.recommendGap,
      soaBottomLabel: detail.ribbon.soaBottom.label,
      soaBottomValue: formatPercent(detail.ribbon.soaBottom.value),
    },
    credibility: {
      totalSample: String(evidence.credibility.totalSample),
      validSample: String(evidence.credibility.validSample),
      validReturnRate: formatPercent(evidence.credibility.validReturnRate),
      dualSourceRate: formatPercent(evidence.credibility.dualSourceRate),
      manualReviewRate: formatPercent(evidence.credibility.manualReviewRate),
      overallCi: evidence.credibility.overallCiPp === null ? '—' : `±${evidence.credibility.overallCiPp}pp`,
    },
    metricRows: metrics.map(metric => ({
      code: metric.metricCode,
      name: metric.metricName || metric.metricCode,
      dimension: metric.dimensionValue || metric.dimensionType,
      dimensionType: metric.dimensionType,
      value: metric.unit === 'percent' ? formatPercent(metric.value) : metric.value === null ? '—' : String(metric.value),
      unit: metric.unit,
      sample: metric.sampleCount === null ? '—' : String(metric.sampleCount),
    })),
    evidences: evidence.evidences.map(item => ({
      title: item.title || item.url || item.domain || '证据',
      type: item.evidenceType,
      domain: item.domain,
      platform: item.platform,
      excerpt: item.evidenceText,
      url: item.url,
    })),
    competitorDetails: {
      ownBrandName: competitors.overallRanks.find(item => item.ownBrand)?.brandName ?? '我方',
      brands: [...new Set([...competitors.overallRanks.map(item => item.brandName), ...competitors.platformMatrix.map(item => item.brandName), ...competitors.personaIntentMatrix.map(item => item.brandName)])],
      platformMatrix: pivotCompetitorCells(competitors.platformMatrix),
      personaIntentMatrix: pivotCompetitorCells(competitors.personaIntentMatrix),
      sourceCooccurrence: competitors.sourceCooccurrence.map(item => ({
        title: item.pageTitle || item.pageUrl,
        domain: item.domain,
        citations: String(item.citationCount),
        platforms: formatPlatformList(item.platforms),
        ourMentioned: yesNoValue(item.isOurMentioned),
        competitors: formatCompetitorNames(item.competitorNames),
        url: item.pageUrl,
      })),
      narratives: {
        gapPlatform: competitors.narrative.gapPlatform,
        gapPersonaIntent: competitors.narrative.gapPersonaIntent,
        gapSource: competitors.narrative.gapSource,
      },
    },
    isLiveData: true,
  }
}

