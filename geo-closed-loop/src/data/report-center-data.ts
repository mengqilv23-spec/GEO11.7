export type ReportType = 'weekly' | 'monthly' | 'quarterly' | 'adhoc'
export type ReportFilter = 'all' | ReportType

export interface ReportSection {
  title: string
  summary: string
}

export interface ReportRecord {
  id: string
  type: ReportType
  title: string
  period: string
  date: string
  summary: string
  tags: string[]
  sections: ReportSection[]
  questionIds: string[]
  status: 'generated' | 'outline' | 'generating' | 'failed' | 'archived'
  empty?: boolean
  scopeSummary?: string
}

export const initialMonthlyQuota = 2

export const initialReports: ReportRecord[] = [
  {
    id: 'weekly-2026-09-15',
    type: 'weekly',
    title: '周度趋势报告',
    period: '监测周期 7 天',
    date: '2026-09-15',
    summary: '本周核心指标变化、平台与人设表现，以及新增问题命中和引用证据。',
    tags: ['核心指标', '趋势变化', '平台表现', '关键证据'],
    sections: [
      { title: '核心指标', summary: '汇总品牌提及、推荐与引用表现。' },
      { title: '趋势变化', summary: '对比近期采样批次，标注值得关注的变化。' },
      { title: '平台与人设表现', summary: '比较 AI 平台和买家人设下的结果差异。' },
      { title: '关键证据', summary: '列出代表性问题、回答与信源页面。' },
    ],
    questionIds: ['Q01', 'Q02'],
    status: 'generated',
  },
  {
    id: 'monthly-2026-09',
    type: 'monthly',
    title: '月度汇报报告',
    period: '2026-09-01—09-18 · 当前月度累计',
    date: '2026-09-14',
    summary: '本月 GEO 表现、关键趋势、主要变化与阶段成果，适合月度业务复盘。',
    tags: ['结果总览', '阶段趋势', '关键变化', '可信度说明'],
    sections: [
      { title: '结果总览', summary: '展示当前月度累计结果与置信区间。' },
      { title: '阶段趋势', summary: '回顾周度变化与主要波动区间。' },
      { title: '关键变化', summary: '提炼本月重要增量及需跟进的问题。' },
      { title: '可信度说明', summary: '说明采样范围、有效回答和统计口径。' },
    ],
    questionIds: ['Q01', 'Q05'],
    status: 'generated',
  },
  {
    id: 'adhoc-2026-09-12',
    type: 'adhoc',
    title: '专项监测次报',
    period: '专项触发 · 单次监测',
    date: '2026-09-12',
    summary: '围绕重点竞品与关键问题进行单次监测，快速查看本次变化与引用证据。',
    tags: ['专项结果', '重点问题', '竞品变化', '引用证据'],
    sections: [
      { title: '专项结果', summary: '汇总本次专项监测的核心发现。' },
      { title: '重点问题', summary: '查看本次关注问题的回答与品牌表现。' },
      { title: '引用证据', summary: '列出支持本次结论的回答和来源页面。' },
    ],
    questionIds: ['Q01', 'Q03'],
    status: 'generated',
  },
  {
    id: 'quarterly-2026-q3',
    type: 'quarterly',
    title: '季度成果汇报',
    period: '2026 Q3 · 季度累计',
    date: '2026-09-10',
    summary: '季度核心成果、阶段趋势、重要变化与关键证据，面向负责人及管理层汇报。',
    tags: ['季度成果', '阶段对比', '关键证据', '管理层汇报'],
    sections: [
      { title: '季度成果', summary: '汇总季度核心指标和主要成果。' },
      { title: '阶段对比', summary: '对比季度内各阶段的表现变化。' },
      { title: '关键证据', summary: '查看支持结论的问题、回答和引用页面。' },
      { title: '管理层汇报', summary: '提供适用于管理层汇报的章节结构。' },
    ],
    questionIds: ['Q01', 'Q03'],
    status: 'outline',
  },
  {
    id: 'weekly-2026-09-08',
    type: 'weekly',
    title: '周度趋势报告',
    period: '监测周期 7 天',
    date: '2026-09-08',
    summary: '上周核心指标、平台表现与重点问题证据，作为本周变化的对比基线。',
    tags: ['趋势图', '平台表现', '重点问题'],
    sections: [
      { title: '趋势图', summary: '展示上周关键指标变化。' },
      { title: '平台表现', summary: '汇总各 AI 平台中的品牌表现。' },
      { title: '重点问题', summary: '列出需要持续观察的问题。' },
    ],
    questionIds: ['Q02', 'Q04'],
    status: 'generated',
  },
]

export function filterReports(reports: readonly ReportRecord[], type: ReportFilter): ReportRecord[] {
  return [...reports]
    .filter(report => type === 'all' || report.type === type)
    .sort((left, right) => right.date.localeCompare(left.date))
}

export function createDemoReport(reports: readonly ReportRecord[], quota: number, now = new Date()) {
  if (quota <= 0)
    return { reports: [...reports], quota: 0, report: null }

  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
  const report: ReportRecord = {
    id: `weekly-${date}-demo`,
    type: 'weekly',
    title: '周度趋势报告',
    period: '最新监测周期 · 演示生成',
    date,
    summary: '这是一份演示生成的最新报告，展示本轮核心指标、趋势变化与关键证据。',
    tags: ['核心指标', '趋势变化', '平台表现', '演示数据'],
    sections: [
      { title: '核心指标', summary: '本地演示摘要：概览品牌提及、推荐与引用表现。' },
      { title: '趋势变化', summary: '本地演示摘要：对照最近监测批次查看变化。' },
      { title: '平台与人设表现', summary: '本地演示摘要：查看平台和买家人设维度。' },
      { title: '关键证据', summary: '本地演示摘要：回到监测问题查看回答与引用。' },
    ],
    questionIds: ['Q01'],
    status: 'generated',
  }

  return {
    reports: filterReports([report, ...reports], 'all'),
    quota: quota - 1,
    report,
  }
}

