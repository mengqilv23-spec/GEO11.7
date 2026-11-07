import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { getReportDetailData } from '../../data/report-detail-data'
import ReportDetailDocument from './ReportDetailDocument.vue'
import ReportEChart from './ReportEChart.vue'

describe('report detail document', () => {
  it('renders a complete report with navigable sections and a print action', async () => {
    const profile = getReportDetailData('monthly-2026-09')!
    const wrapper = mount(ReportDetailDocument, { props: { profile } })

    expect(wrapper.get('h1').text()).toBe('9月 GEO 月度表现与复盘')
    expect(wrapper.findAll('.report-section')).toHaveLength(5)
    expect(wrapper.get('.report-toc a[href="#details"]').text()).toContain('监测明细')
    expect(wrapper.get('.question-table tbody').text()).toContain('航空部件采购经理')
    expect(wrapper.find('.report-title-row .report-status').exists()).toBe(false)
    expect(wrapper.find('#summary > .section-heading .section-label').exists()).toBe(false)
    expect(wrapper.find('#analysis > .section-heading .section-label').exists()).toBe(false)
    expect(wrapper.findAllComponents(ReportEChart)).toHaveLength(3)
    expect(wrapper.find('svg.trend-chart').exists()).toBe(false)

    wrapper.unmount()
  })

  it('renders charts in their report sections without adding a duplicate trend chart to key findings', () => {
    const wrapper = mount(ReportDetailDocument, { props: { profile: getReportDetailData('monthly-2026-09')! } })
    const charts = wrapper.findAllComponents(ReportEChart)

    expect(charts.map(chart => chart.props('label'))).toEqual([
      '竞品品牌综合可见性排名对比',
      '核心指标表现',
      '不同买家人设的品牌提及率对比',
    ])
    expect(wrapper.find('#analysis .trend-panel').exists()).toBe(false)
    expect(charts[0]!.props('option')).toMatchObject({
      yAxis: { type: 'category', data: ['Flow', 'APW Waterjet', 'OMAX', 'KMT'] },
      series: [{ type: 'bar' }],
    })
    expect(charts[1]!.props('option')).toMatchObject({
      xAxis: { type: 'category', data: ['较上月 2026-08-01—08-31', '2026-09-14'] },
      series: [
        { name: '品牌提及率（SOA）', data: [41, 44] },
        { name: '品牌推荐率', data: [28, 31] },
        { name: '官网引用率', data: [17, 19] },
        { name: '声量份额（SOV）', data: [26, 29] },
      ],
    })
    expect(charts[2]!.props('option')).toMatchObject({
      yAxis: { type: 'category', data: ['复材加工技术主管', '航空部件采购经理', '精密加工车间主管', '商社设备采购担当'] },
      series: [{ type: 'bar', data: [62, 55, 48, 29] }],
    })
    wrapper.unmount()
  })

  it('keeps the 4.3 persona chart available in weekly, monthly, quarterly, and ad-hoc reports', () => {
    for (const reportId of ['weekly-2026-09', 'monthly-2026-09', 'quarterly-2026-q3', 'adhoc']) {
      const wrapper = mount(ReportDetailDocument, { props: { profile: getReportDetailData(reportId)! } })
      expect(wrapper.find('#details [aria-label="核心指标表现"]').exists()).toBe(true)
      expect(wrapper.find('#details .persona-chart').exists()).toBe(true)
      expect(wrapper.find('#analysis .trend-panel').exists()).toBe(false)
      wrapper.unmount()
    }
  })

  it('shows the 4.3 core-metrics chart for live reports using the returned metric snapshot', () => {
    const profile = {
      ...getReportDetailData('adhoc')!,
      isLiveData: true,
      date: '2026-10-15',
      trendPoints: [],
      metrics: [
        { label: '品牌提及率（SOA）', value: '42%', delta: '—', baseline: '—', note: '有效样本 48' },
        { label: '品牌推荐率', value: '28%', delta: '—', baseline: '—', note: '有效样本 48' },
        { label: '官网引用率', value: '17%', delta: '—', baseline: '—', note: '有效样本 48' },
        { label: '声量份额（SOV）', value: '27%', delta: '—', baseline: '—', note: '有效样本 48' },
      ],
    }
    const wrapper = mount(ReportDetailDocument, { props: { profile } })
    const chart = wrapper.findAllComponents(ReportEChart).find(item => item.props('label') === '核心指标表现')

    expect(chart).toBeDefined()
    expect(chart!.props('option')).toMatchObject({
      xAxis: { type: 'category', data: ['2026-10-15'] },
      series: [
        { name: '品牌提及率（SOA）', data: [42] },
        { name: '品牌推荐率', data: [28] },
        { name: '官网引用率', data: [17] },
        { name: '声量份额（SOV）', data: [27] },
      ],
    })
    wrapper.unmount()
  })

  it('plots each returned core-metric series across monitoring dates', () => {
    const profile = {
      ...getReportDetailData('adhoc')!,
      isLiveData: true,
      trendPoints: [
        { date: '2026-10-14', roundId: 1, metricCode: 'mention_rate', value: 40, sort: 1 },
        { date: '2026-10-15', roundId: 2, metricCode: 'mention_rate', value: 42, sort: 2 },
        { date: '2026-10-14', roundId: 1, metricCode: 'recommend_rate', value: 26, sort: 1 },
        { date: '2026-10-15', roundId: 2, metricCode: 'recommend_rate', value: 28, sort: 2 },
      ],
    }
    const wrapper = mount(ReportDetailDocument, { props: { profile } })
    const chart = wrapper.findAllComponents(ReportEChart).find(item => item.props('label') === '核心指标表现')

    expect(chart?.props('option')).toMatchObject({
      xAxis: { data: ['2026-10-14', '2026-10-15'] },
      series: [
        { name: '品牌提及率（SOA）', data: [40, 42] },
        { name: '品牌推荐率', data: [26, 28] },
        { name: '官网引用率', data: [null, null] },
        { name: '声量份额（SOV）', data: [null, null] },
      ],
    })
    wrapper.unmount()
  })

  it('highlights the section at the scroll position and the final section near the bottom', async () => {
    const wrapper = mount(ReportDetailDocument, { attachTo: document.body, props: { profile: getReportDetailData('monthly-2026-09')! } })
    const sectionTops: Record<string, number> = { summary: -300, analysis: 70, evidence: 620, details: 1300, strategy: 2400 }
    wrapper.findAll('.report-section').forEach((section) => {
      vi.spyOn(section.element, 'getBoundingClientRect').mockImplementation(() => ({
        top: sectionTops[(section.element as HTMLElement).id]!,
        bottom: 100,
        left: 0,
        right: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect)
    })

    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 400 })
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 3000 })
    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.report-toc a[href="#analysis"]').attributes('aria-current')).toBe('location')

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 2250 })
    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.report-toc a[href="#strategy"]').attributes('aria-current')).toBe('location')
    wrapper.unmount()
  })

  it('clearly marks an outline report as not yet generated', () => {
    const wrapper = mount(ReportDetailDocument, { props: { profile: getReportDetailData('quarterly-2026-q3')! } })

    expect(wrapper.get('h1').text()).toContain('第三季度')
    wrapper.unmount()
  })

  it('keeps the same five sections for live reports and shows missing recommendations without fake snapshot data', () => {
    const profile = {
      ...getReportDetailData('adhoc')!,
      isLiveData: true,
      scopeSummary: '美国 / 英语',
      personaCount: 2,
      intentCount: 3,
      keywordCount: 4,
      questionCount: 12,
      platformCount: 2,
      trendPoints: [],
      recommendations: [],
      competitorRanks: [],
      competitorSummary: '',
      competitorNarratives: [],
      credibility: { totalSample: '12', validSample: '12', validReturnRate: '100%', dualSourceRate: '100%', manualReviewRate: '100%', overallCi: '±0pp' },
      evidences: [{ title: '证据样例', type: 'ai_answer', domain: '', platform: 'chatgpt', excerpt: '证据摘录', url: '' }],
      competitorDetails: {
        ownBrandName: 'APW',
        brands: ['APW'],
        platformMatrix: [{ dimension: 'ChatGPT', values: { APW: { value: '80%', numerator: 8, denominator: 10 } } }],
        personaIntentMatrix: [],
        sourceCooccurrence: [],
        narratives: { gapPlatform: '平台总结', gapPersonaIntent: '', gapSource: '' },
      },
    }
    const wrapper = mount(ReportDetailDocument, { props: { profile } })

    expect(wrapper.findAll('.report-section')).toHaveLength(5)
    expect(wrapper.get('.report-toc').text()).toContain('五、优化建议')
    expect(wrapper.get('#strategy').text()).toContain('暂无优化建议数据')
    expect(wrapper.get('.report-scope').text()).toContain('美国 / 英语')
    expect(wrapper.get('.report-scope').text()).not.toContain('6 类人设')
    expect(wrapper.find('.trend-panel').exists()).toBe(false)
    expect(wrapper.get('.competitor-breakdown-title').text()).toBe('差距拆解：本品与竞品同维对照')
    expect(wrapper.get('.platform-brand-table').text()).toContain('8/10 · 80%')
    expect(wrapper.text()).not.toContain('竞品格局总总结')
    expect(wrapper.text()).not.toContain('下周期核对方向')
    expect(wrapper.find('.methodology').exists()).toBe(false)
    expect(wrapper.get('#details').text()).not.toContain('4.6')
    expect(wrapper.get('#details').text()).not.toContain('可信度待评估')
    expect(wrapper.get('#details').text()).not.toContain('累计采样数')
    expect(wrapper.get('#details').text()).not.toContain('有效返回率')
    expect(wrapper.get('#details').text()).not.toContain('证据条目')
    expect(wrapper.get('.primary-metrics').findAll('article')).toHaveLength(4)
    expect(wrapper.get('.primary-metrics').text()).not.toContain('本次监测值')
    expect(wrapper.get('#evidence').text()).not.toContain('Flow')
    wrapper.unmount()
  })

  it('renders the persona-theme matrix and intent metric blocks from the report design', () => {
    const profile = {
      ...getReportDetailData('adhoc')!,
      isLiveData: true,
      personaThemeMatrix: [
        { persona: '技术负责人', theme: '水射流工艺', value: '80%' },
      ],
      intentMetrics: [
        { name: '信息查询（认知）', value: '61%', sample: '6 类人设' },
        { name: '方案比较（评估）', value: '52%', sample: '6 类人设' },
      ],
    }
    const wrapper = mount(ReportDetailDocument, { props: { profile } })
    const section = wrapper.get('#details')

    expect(section.find('.heatmap-table').exists()).toBe(true)
    expect(section.get('.heatmap-table').text()).toContain('水射流工艺')
    expect(section.findAll('.persona-intent-card')).toHaveLength(2)
    expect(section.get('.persona-theme-card').text()).toContain('买家人设 × 核心主题')
    expect(section.get('.persona-intent-card--intent').text()).toContain('买家人设 × 意图阶段')
    expect(section.get('.intent-list').text()).toContain('信息查询（认知）')
    expect(section.get('.intent-list').text()).not.toContain('样本 6 类人设')
    expect(section.findAll('.intent-list article')).toHaveLength(2)
    wrapper.unmount()
  })

  it('shows source summary cards and both source tables using the report data', () => {
    const profile = {
      ...getReportDetailData('adhoc')!,
      isLiveData: true,
      sources: [
        { domain: 'external.example', citations: '8', answers: '3', platforms: 'ChatGPT', ourMentioned: '否' },
        { domain: 'brand.example', citations: '2', answers: '1', platforms: 'Perplexity', ourMentioned: '是' },
      ],
      sourcePages: [
        { title: '外部文章', domain: 'external.example', citations: '8', url: 'https://external.example/page', questionCount: '3', platforms: 'ChatGPT', ourMentioned: '否', competitors: '竞争品牌' },
        { title: '品牌页面', domain: 'brand.example', citations: '2', url: 'https://brand.example/page', questionCount: '1', platforms: 'Perplexity', ourMentioned: '是', competitors: '—' },
      ],
    }
    const wrapper = mount(ReportDetailDocument, { props: { profile } })
    const section = wrapper.get('#details')

    expect(section.get('.source-insights').text()).toContain('80.0%')
    expect(section.get('.source-insights').text()).toContain('external.example')
    expect(section.get('.source-insights').text()).toContain('1 个')
    expect(section.findAll('.source-insights')).toHaveLength(1)
    expect(section.findAll('.source-insights + .table-wrap')).toHaveLength(1)
    expect(section.text()).toContain('被引页面')
    wrapper.unmount()
  })

  it('shows a vertical scrollbar for the cited pages table when it has more than ten rows', () => {
    const profile = {
      ...getReportDetailData('adhoc')!,
      isLiveData: true,
      sourcePages: Array.from({ length: 11 }, (_, index) => ({
        title: `引用页面 ${index + 1}`,
        domain: 'example.com',
        citations: '1',
        url: `https://example.com/page-${index + 1}`,
        questionCount: '1',
        platforms: 'ChatGPT',
        ourMentioned: '否',
        competitors: '—',
      })),
    }
    const wrapper = mount(ReportDetailDocument, { props: { profile } })
    const scrollArea = wrapper.get('.source-page-table .table-wrap')

    expect(scrollArea.classes()).toContain('is-scrollable')
    expect(scrollArea.findAll('tbody tr')).toHaveLength(11)
    wrapper.unmount()
  })

  it('formats question-hit rows without user-facing sample or confidence values', () => {
    const profile = {
      ...getReportDetailData('adhoc')!,
      isLiveData: true,
      questions: [{
        question: '监测问题示例',
        persona: '复材技术主管',
        platforms: 'ChatGPT：第 1 位 · Perplexity：第 3 位',
        officialEvidence: '是',
        trend: '',
        answer: '不应展示在此表格中的回答摘录',
        rank: '第 1 位 / 3',
        sample: '52/54',
        confidence: '±7.4pp',
      }],
    }
    const wrapper = mount(ReportDetailDocument, { props: { profile } })
    const row = wrapper.get('.question-table tbody tr')

    expect(row.findAll('.question-platform-tag').map(tag => tag.text())).toEqual(['ChatGPT：第 1 位', 'Perplexity：第 3 位'])
    expect(row.text()).toContain('是')
    expect(row.text()).not.toContain('APW 页面')
    expect(row.text()).toContain('第 1 位 / 3')
    expect(row.text()).not.toContain('n=52/54')
    expect(row.text()).not.toContain('±7.4pp')
    expect(row.text()).not.toContain('不应展示在此表格中的回答摘录')
    wrapper.unmount()
  })

  it('hides report sample sizes and intervals and omits the removed credibility module', () => {
    const profile = {
      ...getReportDetailData('weekly-2026-09')!,
      isLiveData: true,
      credibility: { totalSample: '240', validSample: '228', validReturnRate: '95%', dualSourceRate: '90%', manualReviewRate: '88%', overallCi: '±3.1pp' },
      platforms: [{ name: 'ChatGPT', mention: '42%', citations: '17%', sample: '有效回答 228/240', movement: '+5pp', displayStatus: 1, avgRank: '1' }],
      intentMetrics: [{ name: '交易', value: '61%', sample: '120' }],
    }
    const wrapper = mount(ReportDetailDocument, { props: { profile } })

    expect(wrapper.find('.methodology').exists()).toBe(false)
    expect(wrapper.get('#details').text()).not.toContain('4.6')
    expect(wrapper.get('#details').text()).not.toContain('可信度待评估')
    expect(wrapper.get('#details').text()).not.toContain('报告接口暂未提供可信度等级')
    expect(wrapper.get('#details').text()).not.toContain('±3.1pp')
    expect(wrapper.get('#details').text()).not.toContain('228/240')
    expect(wrapper.get('#details').text()).not.toContain('样本 120')
    expect(wrapper.get('#details').text()).toContain('+5pp')
    wrapper.unmount()
  })

  it('limits 4.1 to four primary metrics and three consolidated auxiliary groups', () => {
    const profile = {
      ...getReportDetailData('adhoc')!,
      isLiveData: true,
      metrics: [
        { label: '品牌提及率', value: '100%', delta: '—', baseline: '—', note: '有效样本 48' },
        { label: '品牌推荐率', value: '100%', delta: '—', baseline: '—', note: '有效样本 48' },
        { label: '官网引用率', value: '100%', delta: '—', baseline: '—', note: '有效样本 48' },
        { label: '声量份额（SOV）', value: '67.3%', delta: '—', baseline: '—', note: '有效样本 214' },
      ],
      metricRows: [
        { code: 'avg_rank', name: '平均位次', dimension: 'overall', dimensionType: 'overall', value: '1', unit: 'rank', sample: '48' },
        { code: 'citation_rate', name: '官网引用率', dimension: 'overall', dimensionType: 'overall', value: '100%', unit: 'percent', sample: '48' },
        { code: 'factual_accuracy', name: '事实准确率', dimension: 'overall', dimensionType: 'overall', value: '100%', unit: 'percent', sample: '48' },
        { code: 'factual_error_rate', name: '事实错误率', dimension: 'overall', dimensionType: 'overall', value: '0%', unit: 'percent', sample: '48' },
        { code: 'mention_rate', name: '品牌提及率', dimension: 'overall', dimensionType: 'overall', value: '100%', unit: 'percent', sample: '48' },
        { code: 'recommend_rate', name: '品牌推荐率', dimension: 'overall', dimensionType: 'overall', value: '100%', unit: 'percent', sample: '48' },
        { code: 'sentiment_negative_rate', name: '情感负面占比', dimension: 'overall', dimensionType: 'overall', value: '0%', unit: 'percent', sample: '48' },
        { code: 'sentiment_neutral_rate', name: '情感中性占比', dimension: 'overall', dimensionType: 'overall', value: '0%', unit: 'percent', sample: '48' },
        { code: 'sentiment_positive_rate', name: '情感正面占比', dimension: 'overall', dimensionType: 'overall', value: '100%', unit: 'percent', sample: '48' },
        { code: 'sov_rate', name: '声量份额SOV', dimension: 'overall', dimensionType: 'overall', value: '67.3%', unit: 'percent', sample: '214' },
        { code: 'top1_rate', name: 'Top1率', dimension: 'overall', dimensionType: 'overall', value: '100%', unit: 'percent', sample: '48' },
        { code: 'top3_rate', name: 'Top3率', dimension: 'overall', dimensionType: 'overall', value: '100%', unit: 'percent', sample: '48' },
        { code: 'top5_rate', name: 'Top5率', dimension: 'overall', dimensionType: 'overall', value: '100%', unit: 'percent', sample: '48' },
        { code: 'valid_answer_rate', name: '有效回答率', dimension: 'overall', dimensionType: 'overall', value: '100%', unit: 'percent', sample: '48' },
      ],
    }
    const wrapper = mount(ReportDetailDocument, { props: { profile } })

    expect(wrapper.get('.primary-metrics').findAll('article')).toHaveLength(4)
    expect(wrapper.get('.aux-strip').findAll(':scope > span')).toHaveLength(3)
    expect(wrapper.get('.aux-strip').text()).toContain('平均位次')
    expect(wrapper.get('.aux-strip').text()).toContain('正向 100%')
    expect(wrapper.get('.aux-strip').text()).toContain('事实准确率 100%')
    expect(wrapper.get('.aux-strip').text()).not.toContain('Top1率')
    expect(wrapper.get('.aux-strip').text()).not.toContain('Top3率')
    expect(wrapper.get('.aux-strip').text()).not.toContain('有效回答率')
    wrapper.unmount()
  })
})

