import type { TaskWorkflow } from '../workflows/task-workflow'
import type { GeoTask } from './geo-data'

interface PublishedContentTaskConfig {
  id: string
  name: string
  persona: string
  factor: string
  methods: string[]
  targetPage: string
  title: string
  body: string
  revision: number
  publishedAt: string
  url: string
}

/**
 * Completed website-content tasks used by the brand content verification page.
 * They stay separate from the in-flight prototype tasks so the optimisation
 * flow keeps its existing state while every verified article still has a task
 * number that opens the normal task detail.
 */
function makePublishedTask(config: PublishedContentTaskConfig): GeoTask {
  const brief = {
    goal: config.name,
    persona: config.persona,
    factor: config.factor,
    source: '已发布内容 / 品牌内容核验',
    executionTarget: `官网 · ${config.targetPage}`,
    acceptance: '页面内容与已确认的业务事实和执行范围一致；发布后进入品牌内容核验。',
  }
  const workflow: TaskWorkflow = {
    brief,
    briefStatus: 'confirmed',
    feedback: '',
    versions: [{
      version: 1,
      time: config.publishedAt,
      note: '内容发布版本',
      brief,
      methods: [...config.methods],
      knowledge: [],
      output: config.body,
    }],
    knowledge: [],
    output: { title: config.title, body: config.body, revision: config.revision },
    reviews: [
      { time: config.publishedAt, actor: 'AI 建站', note: `官网发布完成，已返回线上地址：${config.url}` },
      { time: config.publishedAt, actor: '系统', note: '内容已进入品牌内容核验。' },
    ],
    site: {
      requirements: config.methods.join('、'),
      attempts: 1,
      simulateFailure: false,
      preview: config.url,
      result: '官网已发布，返回线上地址。',
      targetSite: 'APW 水刀切割网站',
      targetPage: config.targetPage,
      changeType: '官网内容新增 / 更新',
      factBoundary: '使用客户终审版本；不得扩写未经确认的价格、交期、认证和服务承诺。',
      acceptance: '页面内容与已确认的业务事实和执行范围一致；发布后进入品牌内容核验。',
    },
    url: config.url,
  }
  return {
    id: config.id,
    name: config.name,
    type: 'web',
    source: '品牌内容核验 · 已发布',
    strategy: '不经过候选策略',
    persona: config.persona,
    factor: config.factor,
    methods: [...config.methods],
    destination: `官网 · ${config.targetPage}`,
    progress: 'done',
    origin: 'standalone',
    relatedStrategies: [],
    baselineVersion: 'V1',
    strategyWindow: '09/08–09/14',
    workflow,
  }
}

export const publishedContentTasks: GeoTask[] = [
  makePublishedTask({
    id: 'T-2404',
    name: '碳纤维方案页：补充无热影响区与 25mm 工艺参数',
    persona: '复材技术负责人',
    factor: '无热影响区 / 切割精度',
    methods: ['工艺参数表', '可引用段落', '分层控制 FAQ'],
    targetPage: '碳纤维方案页',
    title: 'APW Waterjet · Carbon Fiber Solutions',
    body: [
      '<h2>碳纤维复材水刀切割</h2>',
      '<p>APW 五轴磨料水刀系统面向 CFRP 切割，采用冷切割工艺，避免热影响区，并通过工艺参数控制降低分层与毛刺风险。</p>',
      '<h2>工艺参数</h2>',
      '<p>25 mm CFRP 切割表面粗糙度 Ra ≤ 3.2 µm；具体参数需结合材料、设备配置与测试条件确认。</p>',
      '<h2>常见问题</h2>',
      '<p>如何避免分层？需要结合材料铺层、切割路径、压力和磨料流量进行验证。</p>',
    ].join(''),
    revision: 2,
    publishedAt: '2026-09-12T09:00:00.000Z',
    url: 'https://apw.com/en/solutions/carbon-fiber',
  }),
  makePublishedTask({
    id: 'T-2405',
    name: '水刀 vs 激光对比页：补充边缘质量与适用边界',
    persona: '复材技术主管',
    factor: '边缘质量 / 工艺选择',
    methods: ['对比表', '适用边界说明', '可引用段落'],
    targetPage: '水刀 vs 激光对比页',
    title: 'APW Waterjet · Waterjet vs Laser',
    body: [
      '<h2>水刀与激光切割碳纤维的差异</h2>',
      '<p>激光切割碳纤维可能产生热影响区和焦边；磨料水刀属于冷切割，适合对热损伤敏感的材料。</p>',
      '<h2>如何选择</h2>',
      '<p>水刀适合厚板、复材和对边缘质量要求高的场景；激光适合薄板与高速度场景。具体选择需结合材料、厚度、精度和成本要求。</p>',
    ].join(''),
    revision: 1,
    publishedAt: '2026-09-13T09:00:00.000Z',
    url: 'https://apw.com/en/compare/waterjet-laser',
  }),
  makePublishedTask({
    id: 'T-2406',
    name: '航空应用页：补充材料适用范围与服务边界',
    persona: '航空部件采购经理',
    factor: '材料适用范围 / 服务边界',
    methods: ['材料适用范围', '服务边界说明', '可引用段落'],
    targetPage: '航空应用页',
    title: 'APW Waterjet · Aerospace Applications',
    body: [
      '<h2>航空制造中的水刀应用</h2>',
      '<p>APW 水刀系统可用于航空复材、钛合金等材料的切割。具体适用材料、厚度和精度要求需结合项目确认。</p>',
      '<h2>服务范围</h2>',
      '<p>服务范围、响应时效和现场支持以双方确认的合作方案为准。</p>',
    ].join(''),
    revision: 1,
    publishedAt: '2026-09-14T09:00:00.000Z',
    url: 'https://apw.com/en/applications/aerospace',
  }),
]
