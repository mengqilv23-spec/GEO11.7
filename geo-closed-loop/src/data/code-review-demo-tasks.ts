import type { TaskWorkflow } from '../workflows/task-workflow'
import type { AuditFinding, GeoTask } from './geo-data'

interface CodeReviewDemoConfig {
  id: string
  name: string
  findingId: string
  check: string
  priority: AuditFinding['priority']
  detail: string
  targetPage: string
  code: string
}

const demoTime = '2026-11-23T09:00:00.000Z'

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

const demoConfigs: CodeReviewDemoConfig[] = [
  {
    id: 'T-2601',
    name: '任务名称1',
    findingId: 'CR-01',
    check: '结构化数据',
    priority: 'P1',
    detail: '代码内容审核测试用例：Organization 地址结构化数据已生成，等待只读审核。',
    targetPage: '全站 Organization 结构化数据',
    code: [
      '<!-- Organization 结构化数据：统一企业地址口径 -->',
      '<script type="application/ld+json">',
      '{',
      '  "@context": "https://schema.org",',
      '  "@type": "Organization",',
      '  "name": "APW Waterjet",',
      '  "url": "https://www.apwwaterjet.com/",',
      '  "address": {',
      '    "@type": "PostalAddress",',
      '    "streetAddress": "上海市浦东新区金桥路 88 号",',
      '    "addressLocality": "上海",',
      '    "addressCountry": "CN"',
      '  }',
      '}',
      '</script>',
    ].join('\n'),
  },
  {
    id: 'T-2602',
    name: '任务名称2',
    findingId: 'CR-02',
    check: '结构化数据',
    priority: 'P1',
    detail: '代码内容审核测试用例：碳纤维方案页 Product 结构化数据已生成，等待只读审核。',
    targetPage: '碳纤维方案页 Product 结构化数据',
    code: [
      '<!-- Product 结构化数据：碳纤维水刀切割方案 -->',
      '<script type="application/ld+json">',
      '{',
      '  "@context": "https://schema.org",',
      '  "@type": "Product",',
      '  "name": "APW 五轴磨料水刀切割系统",',
      '  "brand": { "@type": "Brand", "name": "APW Waterjet" },',
      '  "description": "面向碳纤维复材的冷切割方案，具体参数以已确认的产品资料为准。",',
      '  "additionalProperty": [',
      '    { "@type": "PropertyValue", "name": "切割方式", "value": "五轴磨料水刀" },',
      '    { "@type": "PropertyValue", "name": "适用材料", "value": "碳纤维复材" }',
      '  ]',
      '}',
      '</script>',
    ].join('\n'),
  },
  {
    id: 'T-2603',
    name: '任务名称3',
    findingId: 'CR-03',
    check: '结构化数据',
    priority: 'P1',
    detail: '代码内容审核测试用例：采购问答区 FAQPage 结构化数据已生成，等待只读审核。',
    targetPage: '采购问答区 FAQPage 结构化数据',
    code: [
      '<!-- FAQPage 结构化数据：采购常见问题 -->',
      '<script type="application/ld+json">',
      '{',
      '  "@context": "https://schema.org",',
      '  "@type": "FAQPage",',
      '  "mainEntity": [',
      '    {',
      '      "@type": "Question",',
      '      "name": "水刀切割碳纤维会产生热影响区吗？",',
      '      "acceptedAnswer": {',
      '        "@type": "Answer",',
      '        "text": "磨料水刀属于冷切割工艺，不产生激光切割常见的热影响区；实际效果需结合材料与工艺参数验证。"',
      '      }',
      '    },',
      '    {',
      '      "@type": "Question",',
      '      "name": "如何确认设备是否适用于我的材料？",',
      '      "acceptedAnswer": {',
      '        "@type": "Answer",',
      '        "text": "需要提供材料类型、厚度与精度要求，由技术人员评估设备配置并进行试切验证。"',
      '      }',
      '    }',
      '  ]',
      '}',
      '</script>',
    ].join('\n'),
  },
  {
    id: 'T-2604',
    name: '任务名称4',
    findingId: 'CR-04',
    check: '品牌实体',
    priority: 'P2',
    detail: '代码内容审核测试用例：官网首页元信息与品牌外链代码已生成，等待只读审核。',
    targetPage: '官网首页元信息与品牌外链',
    code: [
      '<!-- 页面元信息与外链实体：品牌官网首页 -->',
      '<meta name="description" content="APW Waterjet 提供五轴水刀、高压水刀与本地化服务支持。">',
      '<link rel="canonical" href="https://www.apwwaterjet.com/">',
      '<meta property="og:title" content="APW Waterjet｜工业水刀切割系统">',
      '<meta property="og:url" content="https://www.apwwaterjet.com/">',
      '<script type="application/ld+json">',
      '{',
      '  "@context": "https://schema.org",',
      '  "@type": "Organization",',
      '  "name": "APW Waterjet",',
      '  "sameAs": [',
      '    "https://www.linkedin.com/company/apw-waterjet"',
      '  ]',
      '}',
      '</script>',
    ].join('\n'),
  },
]

function makeDemoTask(config: CodeReviewDemoConfig): GeoTask {
  const brief = {
    goal: `审核「${config.name}」的官网代码内容`,
    persona: '网站访客 / AI 搜索',
    factor: '代码内容审核',
    source: '代码内容审核测试用例',
    executionTarget: `官网 · ${config.targetPage}`,
    acceptance: '代码可正常读取，结构化字段与已确认的企业和产品事实一致。',
  }
  const body = `<pre><code>${escapeHtml(config.code)}</code></pre>`
  const workflow: TaskWorkflow = {
    brief,
    briefStatus: 'confirmed',
    feedback: '',
    versions: [{
      version: 1,
      time: demoTime,
      note: '生成代码内容并通过自动检查',
      brief,
      methods: ['代码内容审核'],
      knowledge: [],
      output: body,
    }],
    knowledge: [],
    output: { title: config.name, body, revision: 1 },
    reviews: [{ time: demoTime, actor: 'Agent', note: '代码内容已生成并通过自动检查，等待审核。' }],
    site: {
      requirements: '代码内容审核通过后，按官网执行流程部署。',
      attempts: 0,
      simulateFailure: false,
      result: '',
      targetSite: 'APW 水刀切割网站',
      targetPage: config.targetPage,
      changeType: '官网代码新增 / 更新',
      factBoundary: '代码内容只使用已确认的企业与产品事实，不得写入未经确认的地址、参数或服务承诺。',
      acceptance: '代码可正常读取，结构化字段与已确认的企业和产品事实一致。',
    },
    url: '',
  }
  return {
    id: config.id,
    name: config.name,
    type: 'web',
    source: config.findingId,
    strategy: '',
    persona: brief.persona,
    factor: brief.factor,
    methods: ['代码内容审核'],
    destination: `官网 · ${config.targetPage}`,
    progress: 'client_review',
    origin: 'standalone',
    relatedStrategies: [],
    evidence: '用于验证代码内容审核页面的只读展示与通过/忽略操作。',
    contentFormat: 'code',
    baselineVersion: 'V1',
    strategyWindow: '11/23–11/29',
    workflow,
  }
}

/**
 * The diagnosis side of each example. These start as unprocessed findings so
 * they can be confirmed (确认处理) and turned into normal code-review tasks.
 */
export const codeReviewTestFindings: AuditFinding[] = demoConfigs.map(config => ({
  id: config.findingId,
  title: config.name,
  detail: config.detail,
  check: config.check,
  method: '代码内容审核',
  priority: config.priority,
  status: '待处理',
  checked: false,
  route: 'strategy',
  treatment: 'website-content-review',
  category: '官网内容',
  contentFormat: 'code',
  evidence: config.detail,
  routeReason: '代码内容为只读审核：通过后进入官网执行；忽略则不处理该任务，可等下次诊断重新处理。',
}))

/**
 * Four code-content review examples, used to exercise the read-only review
 * workspace with more than one task.
 */
export function codeReviewDemoTasksFor(): GeoTask[] {
  return demoConfigs.map(makeDemoTask)
}
