export type Priority = 'P0' | 'P1' | 'P2' | 'P3'
import type { TaskWorkflow } from '../workflows/task-workflow'

export type GeoPage = 'diagnosis' | 'optimization'
export type ServiceMode = 'managed' | 'agent'
export type UserRole = 'ops' | 'client'
export type StrategyLayer = '全部' | '内容' | '外部信源'
export type TaskFilter = 'all' | 'web' | 'external' | 'repair'
export type FindingTreatment = 'website-tech-direct' | 'website-tech-advice' | 'website-content-review' | 'website-content-advice' | 'website-content-knowledge'
export type DataOrigin = 'geo-audit' | 'buyer-coverage' | 'standalone'
export type TaskProgress = 'brief' | 'todo' | 'running' | 'client_content_review' | 'human' | 'client_review' | 'publish' | 'site_submit' | 'site_submitted' | 'site_running' | 'site_returned' | 'site_verifying' | 'site_publish' | 'site_failed' | 'recheck' | 'done'

export interface BaselineMetric {
  label: string
  value: string
  note: string
}

export interface RadarFactor {
  name: string
  attention?: number
  coverage: number
  competitor: number
}

export interface PersonaGap {
  name: string
  value: number
  source?: string
}

export interface DiagnosisChange {
  label: string
  value: number
  tone: 'blue' | 'orange' | 'green'
}

export interface AuditFinding {
  id: string
  title: string
  detail: string
  check: string
  method: string
  priority: Priority
  status: '待处理' | '待客户审核' | '已生成策略' | '待官网运营审核' | '待专家审核' | '暂不修复' | '已修复' | '无需处理' | '待补充知识'
  feedback?: string
  decisionReason?: string
  checked: boolean
  route: 'repair' | 'strategy' | 'advice' | 'knowledge'
  treatment?: FindingTreatment
  category?: '官网结构' | '官网内容'
  knowledgeTopic?: string
  advice?: string
  evidence?: string
  originalContent?: string
  routeReason: string
}

export interface AuditCheck {
  id: string
  label: string
  passed: boolean
  note: string
  result: string
  evidence: string
  source: string
  priority?: 'P0' | 'P1'
  strategyIds?: string[]
}

export interface Persona {
  id: string
  name: string
  shortName: string
  focus: string
  gaps: PersonaGap[]
  factors: RadarFactor[]
}

export interface Strategy {
  businessGapRecorded?: boolean
  gapFacts?: { verified: boolean, capability: boolean | null, contentExists: boolean, clear: boolean, readable: boolean, thirdParty: boolean }
  id: string
  origin?: DataOrigin
  title: string
  layer: Exclude<StrategyLayer, '全部'>
  priority: Priority
  description: string
  evidence: string
  source: string
  persona: string
  factor: string
  methods: string[]
  confirmed: boolean
  reviewStage?: 'customer'
  personaIds?: string[]
  gapNames?: string[]
  coverageGapRefs?: string[]
  ignored?: boolean
  reviewNote?: string
}

export interface GeoTask {
  priority?: Priority
  sourceKind?: 'geo-audit-content'
  executionKind?: 'verification'
  completionOutcome?: 'expired-unexecuted'
  verificationOutcome?: 'add-content' | 'edit-content' | 'technical' | 'external' | 'business-gap'
  verificationFollowupId?: string
  id: string
  origin?: DataOrigin
  name: string
  type: Exclude<TaskFilter, 'all'>
  source: string
  coverageGapRefs?: string[]
  strategy: string
  persona: string
  factor: string
  methods: string[]
  destination: string
  progress: TaskProgress
  evidence?: string
  auditContent?: { abnormality: string, originalContent: string, modificationScope?: string }
  workflow?: TaskWorkflow
  relatedStrategies: string[]
  baselineVersion?: string
  strategyWindow?: string
}

export const supplementalBriefFindings: AuditFinding[] = [
  { id: 'FC-01', title: '碳纤维切割能力页缺少适用条件', detail: '能力页列出了切割厚度，但没有说明材料类型、设备配置和测试条件，现有产品规格资料可用于核对。', check: '品牌实体', method: '官网内容核对与改写', priority: 'P1', status: '待处理', checked: false, route: 'strategy', treatment: 'website-content-review', category: '官网内容', evidence: '核对记录：官网能力页只给出单一厚度数值；产品规格资料按材料与配置区分适用范围。', routeReason: '确认对应规格后，在 Brief 中明确页面、材料范围和可公开的条件，再补充正文说明。' },
  { id: 'FC-02', title: '德国本地服务页缺少服务边界', detail: '官网介绍了德国本地服务，但没有区分远程支持、现场响应和培训范围；已有服务资料记录了各项适用条件。', check: '跨平台一致性', method: '官网内容核对与改写', priority: 'P1', status: '待处理', checked: false, route: 'strategy', treatment: 'website-content-review', category: '官网内容', evidence: '核对记录：服务页使用统一的“本地支持”表述，服务资料分别列有支持方式和覆盖地区。', routeReason: '在 Brief 中确认服务地区、响应方式与可公开承诺，再改写服务页和相关问答。' },
  { id: 'FC-03', title: '航空采购页面缺少交期口径说明', detail: '采购页面展示标准交期，但没有说明定制配置与验收安排可能影响交付时间；已有交付资料可核对。', check: '跨平台一致性', method: '官网内容核对与改写', priority: 'P2', status: '待处理', checked: false, route: 'strategy', treatment: 'website-content-review', category: '官网内容', evidence: '核对记录：页面使用单一交期表述，交付资料区分标准机型、定制项目及验收节点。', routeReason: '在 Brief 中确认不同项目的交期范围和审批口径，再补充采购页面的适用条件。' },
  { id: 'FC-04', title: '产品对比页未写明比较依据', detail: '产品对比页列出效率和精度优势，但没有标明测试材料、样本条件与数据出处；现有试切记录可核对。', check: '品牌实体', method: '官网内容核对与改写', priority: 'P2', status: '待处理', checked: false, route: 'strategy', treatment: 'website-content-review', category: '官网内容', evidence: '核对记录：对比结论缺少对应的测试条件，试切记录包含材料、设备参数和测量方法。', routeReason: '在 Brief 中选择可公开的测试记录，明确比较对象和适用场景后补充证据说明。' },
]

export const auditFindings: AuditFinding[] = [
  { id: 'F7-1', title: 'Product Schema 缺失', detail: '碳纤维方案页缺少 Product 结构化数据。', check: '结构化数据', method: '官网修复', priority: 'P0', status: '待处理', checked: false, route: 'repair', treatment: 'website-tech-direct', routeReason: '缺失项明确，可按标准规则直接修复和验证。' },
  { id: 'F7-2', title: 'FAQ Schema 缺失', detail: '采购问答区已有内容，但未形成 FAQ 结构化数据。', check: '结构化数据', method: '官网修复', priority: 'P0', status: '待处理', checked: false, route: 'repair', treatment: 'website-tech-direct', routeReason: '已有 FAQ 内容，只需补齐机器可读标记。' },
  { id: 'F8-1', title: '认证编号未结构化', detail: '认证信息可见，但证书编号与适用范围未形成机器可读实体信息。', check: '品牌实体', method: '实体修复', priority: 'P1', status: '待处理', checked: false, route: 'repair', treatment: 'website-tech-direct', routeReason: '认证事实已存在，本次只补机器可读字段。' },
  { id: 'F8-2', title: '专家作者档案待补', detail: '2 位工程师已有内容贡献，但缺少可验证的专业背景、经验与作者介绍。', check: '品牌实体', method: '实体修复', priority: 'P1', status: '待处理', checked: false, route: 'strategy', treatment: 'website-content-review', evidence: '当前作者页仅显示两位工程师的姓名与内容贡献，缺少可核验的专业背景、从业经验及其与相关技术主题的关联，读者和 AI 难以判断作者资质与内容可信度。', advice: '核实并取得本人确认后，围绕工程师负责的技术领域、相关经验和代表性内容补充作者介绍，并将作者档案关联到对应文章；不要加入未经核实的资历或认证信息。', routeReason: '需要确认专家范围、身份事实和对外介绍方式。' },
  { id: 'F8-3', title: 'Organization sameAs 不完整', detail: 'Organization 已部署，但品牌官方外部实体关联仍不完整。', check: '品牌实体', method: '实体修复', priority: 'P1', status: '待处理', checked: false, route: 'repair', treatment: 'website-tech-direct', routeReason: '官方实体来源明确，可补齐 sameAs 关联。' },
  { id: 'F9', title: '跨平台地址口径不一致', detail: '官网 / LinkedIn / 行业名录存在 1 处地址字段口径冲突。', check: '跨平台一致性', method: '官网内容核对与改写', priority: 'P1', status: '待处理', checked: false, route: 'strategy', treatment: 'website-content-review', category: '官网内容', evidence: '官网 / LinkedIn / 行业名录存在 1 处地址字段口径冲突，需先确认权威地址来源。', advice: '地址字段存在冲突，先确认哪个地址正确，再修改官网内容并复核；外部平台另行核查。', routeReason: '先确认正确地址，再修改官网内容并复核；外部平台信息另行核查。' },
  { id: 'F7-3', title: '产品页分组导航建议', detail: '长产品页当前可正常读取，可在后续常规改版时评估增加分组锚点导航。', check: '结构化数据', method: '仅提供建议', priority: 'P3', status: '无需处理', checked: false, route: 'advice', treatment: 'website-tech-advice', category: '官网结构', evidence: '演示检查记录：主要产品内容可读取，当前未发现由分组导航缺失造成的抓取或信息抽取阻断。', advice: '后续常规改版时，可评估为规格、应用和问答区域增加锚点导航；本轮无需修改官网结构。', routeReason: '属于可选的浏览体验建议，本轮无需修复，不进入审核或执行流程。' },
  { id: 'F8-4', title: '案例页摘要表达建议', detail: '案例页已有材料、工艺与应用说明，可在下次内容维护时评估补充简短摘要。', check: '信任信号', method: '仅提供建议', priority: 'P3', status: '无需处理', checked: false, route: 'advice', treatment: 'website-content-advice', category: '官网内容', evidence: '演示检查记录：现有案例包含材料、工艺和应用背景，未发现必须在本轮补齐的事实缺失。', advice: '下次更新案例时，可考虑在正文前加入材料、加工需求和适用场景摘要；本轮无需改写或重新生成内容。', routeReason: '现有内容已具备基本信息，摘要属于可选表达建议，仅供后续维护参考。' },
  { id: 'F8-5', title: '产品技术参数缺少核对依据', detail: '官网已展示产品技术参数，但知识库缺少对应的标准化资料，暂时无法核对型号、参数与适用范围。', check: '品牌实体', method: '补充知识提醒', priority: 'P2', status: '待补充知识', checked: false, route: 'knowledge', treatment: 'website-content-knowledge', category: '官网内容', knowledgeTopic: '产品技术参数', evidence: '演示检查记录：知识库未提供包含产品型号、技术参数和适用范围的结构化资料。当前无法据此判定官网参数是否准确。', advice: '请补充「产品技术参数」相关知识库内容。补充后，系统将在下一次监测时重新核对官网中的对应信息。', routeReason: '因缺少标准化核对依据，当前仅提醒补充知识，不判定为内容错误，也不触发内容改写或官网修复。' },
  ...supplementalBriefFindings,
]

export const clientContentReviewFindings: AuditFinding[] = [
  { id: 'WC-01', title: '产品参数表与正文描述不一致', detail: '同一产品页的参数表与正文中出现两种最大加工厚度，知识库已有可核对的产品规格。', check: '品牌实体', method: '官网内容核对与改写', priority: 'P1', status: '待处理', checked: false, route: 'strategy', category: '官网内容', evidence: '核对记录：同一产品页的参数表与正文中出现两种最大加工厚度，知识库已有可核对的产品规格。', routeReason: '核对规格资料后统一正文与参数表的描述。' },
  { id: 'WC-02', title: '售后服务范围表述不完整', detail: '官网服务页写有全球现场支持，但现有服务资料按地区限定现场支持范围。', check: '跨平台一致性', method: '官网内容核对与改写', priority: 'P1', status: '待处理', checked: false, route: 'strategy', category: '官网内容', evidence: '核对记录：官网服务页写有全球现场支持，但现有服务资料按地区限定现场支持范围。', routeReason: '依据服务资料补充支持地区、服务方式及适用条件。' },
  { id: 'WC-03', title: '交付周期缺少适用条件', detail: '官网展示固定交付周期，但已有交付资料区分标准机型、定制配置与验收安排。', check: '跨平台一致性', method: '官网内容核对与改写', priority: 'P1', status: '待处理', checked: false, route: 'strategy', category: '官网内容', evidence: '核对记录：官网展示固定交付周期，但已有交付资料区分标准机型、定制配置与验收安排。', routeReason: '审核并补齐交付周期的配置条件和计算口径。' },
  { id: 'WC-04', title: '案例页未区分实测与参考数据', detail: '案例正文将试切参考值与客户现场实测结果合并描述，现有案例资料已区分两类数据。', check: '信任信号', method: '官网内容核对与改写', priority: 'P2', status: '待处理', checked: false, route: 'strategy', category: '官网内容', evidence: '核对记录：案例正文将试切参考值与客户现场实测结果合并描述，现有案例资料已区分两类数据。', routeReason: '依据案例资料明确数据来源、测试条件和适用范围。' },
  { id: 'WC-05', title: '认证介绍未说明覆盖范围', detail: '官网认证介绍未区分企业体系认证与产品认证，知识库中已有证书及适用范围资料。', check: '品牌实体', method: '官网内容核对与改写', priority: 'P1', status: '待处理', checked: false, route: 'strategy', category: '官网内容', evidence: '核对记录：官网认证介绍未区分企业体系认证与产品认证，知识库中已有证书及适用范围资料。', routeReason: '核对证书后补充认证对象与有效范围，调整可能产生歧义的表达。' },
  { id: 'WC-06', title: '选型问答缺少材料限制说明', detail: '官网选型问答使用通用推荐表述，已有应用资料列出了不同材料与工艺条件下的限制。', check: '信任信号', method: '官网内容核对与改写', priority: 'P2', status: '待处理', checked: false, route: 'strategy', category: '官网内容', evidence: '核对记录：官网选型问答使用通用推荐表述，已有应用资料列出了不同材料与工艺条件下的限制。', routeReason: '结合应用资料补充材料条件、工艺限制及需要进一步确认的情况。' },
]

export function officialContentSnapshot(finding: AuditFinding): GeoTask['auditContent'] | undefined {
  if (finding.category !== '官网内容' || finding.route !== 'strategy') return undefined
  if (finding.id === 'F9') return {
    abnormality: '官网有关企业地址的文字描述与已确认的企业资料不一致，可能使 AI 难以准确识别企业所在地并关联品牌信息；目前未定位到具体页面。',
    originalContent: '',
    modificationScope: '官网：核对并更新企业地址相关文字描述，结合已确认的品牌名称、地址与联系信息，形成口径一致的企业介绍内容；外部信源另行核查。',
  }
  return {
    abnormality: `${Array.from(finding.detail).slice(0, 100).join('')}这可能影响 AI 准确识别相关品牌信息。`,
    originalContent: Array.from(finding.originalContent ?? '').slice(0, 500).join(''),
    modificationScope: `官网：围绕「${finding.title}」，结合已确认的品牌资料与「${finding.check}」检查结果，更新相关页面的文字内容。`,
  }
}

export const auditChecks: AuditCheck[] = [
  { id: '1', label: '抓取渲染', passed: true, note: 'AI 可正常读取渲染后的官网页面。', result: 'AI 可正常读取渲染后的官网页面。', evidence: '渲染与抓取模拟通过；未发现需要生成候选策略的问题。', source: 'AEO 体检' },
  { id: '2', label: '爬取障碍', passed: true, note: 'robots / JS / 防火墙未发现阻断。', result: 'robots / JS / 防火墙未发现阻断。', evidence: '当前抓取链路通过，没有发现阻止 AI 读取官网内容的技术障碍。', source: 'AEO 体检' },
  { id: '3', label: '索引与 AI 指引', passed: true, note: '页面索引、sitemap、llms.txt 当前正常。', result: '页面索引、sitemap、llms.txt 当前正常。', evidence: '页面可索引，站点 AI 指引相关基础项已建立。', source: 'AEO 体检' },
  { id: '4', label: '结构化数据', passed: false, note: 'Product / FAQ / Organization 存在 2 处缺失。', result: 'Product / FAQ / Organization 结构化数据缺 2 处。', evidence: '机器可读信息不完整，可能导致 AI 无法稳定抽取产品、FAQ 与企业实体信息。', source: 'F7', priority: 'P0', strategyIds: [] },
  { id: '5', label: '品牌实体', passed: false, note: '认证编号未结构化、2 位专家档案待补、sameAs 不完整。', result: '认证编号未结构化、2 位专家档案待补、sameAs 不完整。', evidence: '品牌实体线索仍有断点，AI 对企业、认证与专家身份的统一识别能力不足。', source: 'F8', priority: 'P1', strategyIds: ['GS14'] },
  { id: '6', label: '信任信号', passed: true, note: '已发现认证、案例及第三方引用。', result: '已发现认证、案例及第三方引用等可信信号。', evidence: '当前不是“没有信任信号”，主要问题归入品牌实体异常。', source: 'AEO 体检' },
  { id: '7', label: '跨平台一致性', passed: false, note: '官网 / LinkedIn / 名录存在 1 处地址口径不一致。', result: '官网 / LinkedIn / 名录存在 1 处地址口径不一致。', evidence: '不同公开平台的企业信息不一致，可能削弱 AI 对同一品牌实体的合并判断。', source: 'AEO 审计', priority: 'P1', strategyIds: [] },
]

export const baselineMetrics: BaselineMetric[] = [
  { label: '策略周期', value: '09/14–09/20', note: '每周统一生成方案' },
  { label: '数据更新至', value: '09/17 23:40', note: '最近已完成轮次' },
  { label: '已纳入监测轮次', value: '4 / 7', note: '09/18 本轮仍在进行' },
  { label: '市场 / 语言', value: '德国 / 德语', note: '当前分析范围' },
  { label: '买家人设 / 意图', value: '6 类 / 4 类', note: '沿用当前监测配置' },
  { label: 'Query / AI 平台', value: '67 / 5', note: '当前分析口径' },
]

export const diagnosisChanges: DiagnosisChange[] = [
  { label: '新增', value: 2, tone: 'blue' },
  { label: '持续', value: 4, tone: 'blue' },
  { label: '加剧', value: 1, tone: 'orange' },
  { label: '缓解', value: 1, tone: 'green' },
]

export const personas: Persona[] = [
  { id: 'engineering', name: '复材技术负责人', shortName: '复材技术', focus: '德国 / 英语', gaps: [{ name: '本地服务与培训', value: 40, source: '官网+第三方' }, { name: '认证与合规', value: 35, source: '官网' }, { name: '交期与产能', value: 25, source: '官网' }, { name: '其他', value: 0, source: '其他' }], factors: [{ name: '切割精度', coverage: 88, competitor: 80 }, { name: '无热影响区', coverage: 90, competitor: 78 }, { name: '交期与产能', coverage: 35, competitor: 70 }, { name: '价格与 TCO', coverage: 52, competitor: 60 }, { name: '本地服务与培训', coverage: 40, competitor: 85 }, { name: '认证与合规', coverage: 45, competitor: 82 }, { name: '其他', coverage: 50, competitor: 50 }] },
  { id: 'procurement', name: '航空采购', shortName: '航空采购', focus: '欧洲 / 英语', gaps: [{ name: '交付稳定性', value: 62 }, { name: '认证与合规', value: 55 }, { name: '供应链风险', value: 55 }, { name: '其他', value: 0 }], factors: [{ name: '认证与合规', coverage: 45, competitor: 88 }, { name: '交付稳定性', coverage: 38, competitor: 76 }, { name: '供应链风险', coverage: 35, competitor: 70 }, { name: '售后响应', coverage: 42, competitor: 77 }, { name: '价格与 TCO', coverage: 52, competitor: 62 }, { name: '切割精度', coverage: 88, competitor: 92 }, { name: '其他', coverage: 50, competitor: 50 }] },
  { id: 'plant', name: '日本商社', shortName: '日本商社', focus: '日本 / 日语', gaps: [{ name: '本地服务', value: 65 }, { name: '代理支持', value: 60 }, { name: '交期稳定', value: 55 }, { name: '其他', value: 0 }], factors: [{ name: '本地服务', coverage: 35, competitor: 80 }, { name: '交期稳定', coverage: 35, competitor: 72 }, { name: '代理支持', coverage: 30, competitor: 76 }, { name: '认证合规', coverage: 45, competitor: 82 }, { name: '品牌可信度', coverage: 55, competitor: 84 }, { name: '价格与 TCO', coverage: 52, competitor: 58 }, { name: '其他', coverage: 50, competitor: 50 }] },
  { id: 'distributor', name: '车间主管', shortName: '车间主管', focus: '北美 / 英语', gaps: [{ name: '维护难度', value: 45 }, { name: '停机风险', value: 42 }, { name: '培训成本', value: 40 }, { name: '其他', value: 0 }], factors: [{ name: '操作效率', coverage: 62, competitor: 78 }, { name: '维护难度', coverage: 45, competitor: 72 }, { name: '切割精度', coverage: 88, competitor: 92 }, { name: '培训成本', coverage: 40, competitor: 68 }, { name: '停机风险', coverage: 38, competitor: 66 }, { name: '价格与 TCO', coverage: 52, competitor: 60 }, { name: '其他', coverage: 50, competitor: 50 }] },
  { id: 'quality', name: '质量管理负责人', shortName: '质量管理', focus: '德国 / 英语', gaps: [], factors: [{ name: '切割精度', coverage: 82, competitor: 82 }, { name: '认证与合规', coverage: 82, competitor: 82 }, { name: '交付稳定性', coverage: 74, competitor: 74 }, { name: '售后响应', coverage: 77, competitor: 77 }, { name: '价格与 TCO', coverage: 62, competitor: 62 }, { name: '操作效率', coverage: 78, competitor: 78 }] },
]

export const strategies: Strategy[] = ([
  { id: 'GS1', title: '碳纤维方案页品牌显影：对比表 + FAQ + 品牌事实补充', layer: '内容', priority: 'P0', description: '在碳纤维方案页补充可引用的对比表、FAQ 与品牌实体信息，让 AI 在引用页面时准确识别品牌。', evidence: '页面被 Perplexity 引为来源，但回答只推荐 Flow', source: 'F1', persona: '复材技术负责人、复材初创', factor: '无热影响区 / 品牌显影', methods: ['对比表 / 定义框 / Q&A', '统计数据注入', '品牌与产品事实补充'], personaIds: ['engineering'], gapNames: ['认证与合规', '维护难度'], confirmed: false },
  { id: 'GS8', title: 'CompositesWorld 投稿《碳纤维切割工艺对比》', layer: '外部信源', priority: 'P1', description: '准备行业媒体长稿，使用统计数据与专家引语补充高价值第三方信源。', evidence: '82.9% 引用来自第三方；CompositesWorld 高频且我方零提及', source: 'F5', persona: '复材技术负责人、复材初创', factor: '无热影响区 / 第三方信任', methods: ['行业媒体长稿', '统计数据注入', '专家引语'], personaIds: ['engineering'], gapNames: [], confirmed: false },
  { id: 'GS9', title: 'LinkedIn工程师专栏 + r/Machinists回答草稿', layer: '外部信源', priority: 'P1', description: '围绕真实选型问题准备工程师专栏与社区回答草稿，补充可验证的专业观点。', evidence: 'Perplexity 中 Reddit / r/Machinists 高频出现', source: 'F5', persona: '复材技术负责人', factor: '价格与 TCO', methods: ['社区真实讨论', '专家引语', '选型问答'], personaIds: ['engineering'], gapNames: ['价格与 TCO'], confirmed: false },
  { id: 'GS6', title: '交期与产能页：标准交期区间 + 德国服务网络 SLA', layer: '内容', priority: 'P0', description: '以胶囊答案、产能数据和服务范围说明补齐交付稳定性证据，所有业务承诺由客户在 Brief 中确认。', evidence: '人设重视 100 · 我方 35 · 竞对 70；负面叙事被 2 个引擎复述', source: 'F3', persona: '汽车Tier-1、航空采购', factor: '交期与产能', methods: ['40–60字胶囊答案', '统计数据注入', '权威语态', '对比表 / Q&A'], personaIds: ['procurement'], gapNames: ['本地服务与培训', '交期与产能', '交付稳定性', '供应链风险', '本地服务', '代理支持', '交期稳定'], confirmed: false },
  { id: 'GS7', title: '切割精度事实纠错：统一±0.05mm并结构化参数', layer: '内容', priority: 'P0', description: '对齐已确认的产品事实库，统一精度参数并形成可直接引用的结构化信息。', evidence: 'ChatGPT 错写 ±0.1mm', source: 'F4', persona: '航空采购', factor: '事实准确性', methods: ['事实纠错', '参数结构化', '事实库对齐'], personaIds: ['procurement'], gapNames: [], confirmed: false },
  { id: 'GS4', title: 'JP市场日语内容补齐：日语问答与采购决策内容', layer: '内容', priority: 'P0', description: '补齐日本市场采购问答、本地服务与代理支持内容，覆盖当前未命中的日语问题。', evidence: 'JP 市场 6 条日语提问全线未命中', source: 'F2', persona: '日本商社', factor: '本地服务 / 代理支持', methods: ['日语本地化', 'Q&A', '市场内容覆盖'], personaIds: ['plant'], gapNames: ['本地服务与培训', '本地服务', '代理支持'], confirmed: false },
  { id: 'GS5', title: '产品页内容改写：胶囊答案 + 选型问答 + 分段表达', layer: '内容', priority: 'P1', description: '优化产品说明的表达、问答和段落内容，提升 AI 理解与引用的完整性。', evidence: 'AI 只能截取碎片而非整段引用', source: 'F6', persona: '车间主管', factor: '操作效率', methods: ['胶囊答案', '选型问答', '分段改写'], personaIds: ['distributor'], gapNames: ['维护难度'], confirmed: false },
  { id: 'EXT-YT', title: 'YouTube 试切演示视频描述实体化 + 章节时间戳', layer: '外部信源', priority: 'P2', description: '为试切演示准备品牌、型号、参数说明和章节时间戳，形成易于检索和引用的视频描述。', evidence: '来源图谱显示视频是当前行业可建设的高价值第三方信源', source: 'F5', persona: '车间主管、复材技术负责人', factor: '切割精度 / 可操作性', methods: ['视频描述优化', '品牌 / 型号 / 参数实体', '章节时间戳'], personaIds: ['distributor', 'engineering'], gapNames: ['培训成本'], confirmed: false },
  { id: 'GS10', title: '交期与产能页：补充航空采购 FAQ 与产能表', layer: '内容', priority: 'P1', description: '在交期与产能页补充航空采购问答、产能表和采购核对项，由 Agent 判断是否复用已有任务。', evidence: '与 GS6 指向同一页面、同一目标和同类动作，仅补充同一采购场景的信息结构。', source: 'F3', persona: '航空采购', factor: '交付稳定性', methods: ['交期 FAQ', '产能表', '采购核对项'], personaIds: ['procurement'], gapNames: ['交期与产能', '交付稳定性', '供应链风险', '交期稳定', '维护难度', '停机风险'], confirmed: false },
  { id: 'GS11', title: '交期页增加汽车工艺停机风险与服务问答', layer: '内容', priority: 'P1', description: '补充停机风险、服务保障和车间场景问答，新增范围在后续 Brief 中确认。', evidence: '与现有交期任务目标页相同，但新增人设、决策因子和内容方法，需要专业判断执行范围。', source: 'F3 / F6', persona: '汽车工艺、车间主管', factor: '停机风险 / 服务', methods: ['停机风险 Q&A', '服务问答', '买家场景补充'], personaIds: ['distributor'], gapNames: ['本地服务与培训', '交期与产能', '交付稳定性', '供应链风险', '本地服务', '代理支持', '交期稳定', '停机风险'], confirmed: false },
  { id: 'GS12', title: '欧洲服务响应主题稿：补充服务承诺与适用范围', layer: '外部信源', priority: 'P0', description: '准备欧洲服务响应主题稿，明确服务承诺与市场边界，客户确认业务事实后作为最终内容交付。', evidence: 'Agent 发现可并入既有行业稿件，但会新增欧洲服务响应承诺与适用市场范围，属于业务事实和内容范围变化。', source: 'F3 / F5', persona: '航空采购、汽车工艺', factor: '售后响应 / 供应链风险', methods: ['服务范围说明', '业务事实核验', '适用市场边界'], personaIds: ['procurement'], gapNames: ['本地服务与培训', '供应链风险', '本地服务', '代理支持'], confirmed: false },
  { id: 'GS13', title: '日本代理合作与本地服务说明页', layer: '内容', priority: 'P1', description: '围绕日本商社的代理合作、本地支持和服务范围构建独立说明页。', evidence: '扫描后未找到目标市场、语言、页面和动作均匹配的已有任务，应保持独立执行。', source: 'F2', persona: '日本商社', factor: '代理支持 / 本地服务', methods: ['日语本地化', '代理合作说明', '服务范围 Q&A'], personaIds: ['plant'], gapNames: ['本地服务与培训', '本地服务', '代理支持'], confirmed: false },
  { id: 'GS14', title: '工程师专家档案实体统一与同名消歧', layer: '内容', priority: 'P1', description: '补充可验证的工程师身份、专业背景和实体关联，统一作者档案并消除同名歧义。', evidence: '2 位工程师已有内容贡献，但缺少可验证作者 / 专家实体档案。', source: 'F8-2', origin: 'geo-audit', persona: '不适用', factor: '实体可信度', methods: ['作者实体', '专家档案', 'sameAs消歧'], gapNames: ['认证与合规'], confirmed: false },
] as Strategy[]).map(strategy => ({ ...strategy, origin: strategy.id === 'GS14' ? 'geo-audit' as const : 'buyer-coverage' as const }))

/** Five detail-flow examples transcribed from the current optimization-center prototype. */
export const prototypeTasks: GeoTask[] = [
  { id: 'T-2501', name: '工程师专家档案实体统一与同名消歧', type: 'web', source: 'F8-2', origin: 'geo-audit', strategy: 'GS14', persona: '不适用', factor: '品牌实体', evidence: '当前作者页缺少经确认的工程师背景资料；需审核确认后补充作者档案。', methods: ['核验专家身份', '补充作者档案', '关联对应文章'], destination: '官网内容', progress: 'brief', relatedStrategies: ['GS14'], baselineVersion: 'V2', strategyWindow: '09/14–09/20' },
  { id: 'T-2502', name: '日本代理合作与本地服务说明页', type: 'web', source: '认知缺口策略 12', origin: 'buyer-coverage', strategy: 'GS13', persona: '日本商社', factor: '代理支持 / 本地服务', methods: ['日语本地化', '代理合作说明', '服务范围 Q&A'], destination: '官网内容', progress: 'brief', relatedStrategies: ['GS13'], baselineVersion: 'V1', strategyWindow: '09/14–09/20' },
  { id: 'T-2503', name: '欧洲服务响应主题稿：补充服务承诺与适用范围', type: 'external', source: '认知缺口策略 11', origin: 'buyer-coverage', strategy: 'GS12', persona: '航空采购、汽车工艺', factor: '售后响应 / 供应链风险', methods: ['服务范围说明', '业务事实核验', '适用市场边界'], destination: '外部内容', progress: 'brief', relatedStrategies: ['GS12'], baselineVersion: 'V1', strategyWindow: '09/14–09/20' },
  { id: 'T-2504', name: '交期页增加汽车工艺停机风险与服务问答', type: 'web', source: '认知缺口策略 10', origin: 'buyer-coverage', strategy: 'GS11', persona: '汽车工艺、车间主管', factor: '停机风险 / 服务', methods: ['停机风险 Q&A', '服务问答', '买家场景补充'], destination: '官网内容', progress: 'brief', relatedStrategies: ['GS11'], baselineVersion: 'V1', strategyWindow: '09/14–09/20' },
  { id: 'T-2505', name: '交期与产能页：补充航空采购 FAQ 与产能表', type: 'web', source: '认知缺口策略 9', origin: 'buyer-coverage', strategy: 'GS10', persona: '航空采购', factor: '交付稳定性', methods: ['交期 FAQ', '产能表', '采购核对项'], destination: '官网内容', progress: 'brief', relatedStrategies: ['GS10'], baselineVersion: 'V1', strategyWindow: '09/14–09/20' },
]

export const initialTasks: GeoTask[] = [
  {
    id: 'T-2401',
    name: '碳纤维方案页品牌显影优化',
    type: 'web',
    source: 'F1',
    strategy: 'GS1',
    persona: '复材技术负责人、复材初创',
    factor: '无热影响区 / 品牌显影',
    methods: ['对比表 / 定义框 / Q&A', '统计数据注入', 'JSON-LD sameAs / Product / FAQ'],
    destination: '官网 · 碳纤维方案页',
    progress: 'brief',
    relatedStrategies: ['GS1'],
    baselineVersion: 'V3',
    strategyWindow: '09/14–09/20',
    workflow: {
      brief: {
        goal: '碳纤维方案页品牌显影优化',
        persona: '复材技术负责人、复材初创',
        factor: '无热影响区 / 品牌显影',
        source: 'F1 / GS1',
        executionTarget: '官网 · 碳纤维方案页',
        acceptance: '页面内容与已确认的业务事实和执行范围一致；预览验收通过后进入 GEO Re-check。',
      },
      briefStatus: 'ready',
      feedback: '',
      versions: [
        { version: 1, time: '2026-09-28T09:00:00.000Z', note: '初始 Brief', brief: { goal: '碳纤维方案页品牌显影优化', persona: '复材技术负责人、复材初创', factor: '无热影响区 / 品牌显影', source: 'F1 / GS1', executionTarget: '官网 · 碳纤维方案页', acceptance: '页面内容与已确认的业务事实和执行范围一致。' }, methods: ['对比表 / 定义框 / Q&A', '统计数据注入', 'JSON-LD sameAs / Product / FAQ'], knowledge: [], output: '' },
        { version: 2, time: '2026-09-29T08:30:00.000Z', note: '确认业务事实与验收范围', brief: { goal: '碳纤维方案页品牌显影优化', persona: '复材技术负责人、复材初创', factor: '无热影响区 / 品牌显影', source: 'F1 / GS1', executionTarget: '官网 · 碳纤维方案页', acceptance: '页面内容与已确认的业务事实和执行范围一致；预览验收通过后进入 GEO Re-check。' }, methods: ['对比表 / 定义框 / Q&A', '统计数据注入', 'JSON-LD sameAs / Product / FAQ'], knowledge: [], output: '' },
        { version: 3, time: '2026-09-29T09:00:00.000Z', note: '移除本任务知识库内容', brief: { goal: '碳纤维方案页品牌显影优化', persona: '复材技术负责人、复材初创', factor: '无热影响区 / 品牌显影', source: 'F1 / GS1', executionTarget: '官网 · 碳纤维方案页', acceptance: '页面内容与已确认的业务事实和执行范围一致；预览验收通过后进入 GEO Re-check。' }, methods: ['对比表 / 定义框 / Q&A', '统计数据注入', 'JSON-LD sameAs / Product / FAQ'], knowledge: [], output: '' },
      ],
      knowledge: [],
      output: { title: '碳纤维方案页品牌显影优化', body: '', revision: 1 },
      reviews: [],
      site: {
        requirements: '对比表 / 定义框 / Q&A、统计数据注入、JSON-LD sameAs / Product / FAQ',
        attempts: 0,
        simulateFailure: false,
        preview: '',
        result: '',
        targetSite: 'APW 水刀切割网站',
        targetPage: '碳纤维方案页',
        changeType: '官网内容新增 / 更新',
        factBoundary: '使用客户终审版本；不得扩写未经确认的价格、交期、认证和服务承诺。',
        acceptance: '页面内容与已确认的业务事实和执行范围一致；预览验收通过后进入 GEO Re-check。',
      },
      url: '',
    },
  },
  {
    id: 'T-2402',
    name: '切割精度事实纠错：统一 ±0.05mm 并结构化参数',
    type: 'web',
    source: 'F4',
    strategy: 'GS7',
    persona: '航空采购',
    factor: '事实准确性',
    methods: ['事实纠错', '参数结构化', '事实库对齐'],
    destination: '官网 · 切割精度参数页',
    progress: 'site_failed',
    relatedStrategies: ['GS7'],
    baselineVersion: 'V1',
    strategyWindow: '09/14–09/20',
    workflow: {
      brief: {
        goal: '统一切割精度表述并结构化关键参数',
        persona: '航空采购',
        factor: '事实准确性',
        source: 'F4 / GS7',
        executionTarget: '官网 · 切割精度参数页',
        acceptance: '正文统一使用已确认的 ±0.05mm 精度，关键参数可被搜索引擎与 AI 读取。',
      },
      briefStatus: 'confirmed',
      feedback: '',
      versions: [
        { version: 1, time: '2026-09-28T09:00:00.000Z', note: '初始 Brief', brief: { goal: '统一切割精度表述并结构化关键参数', persona: '航空采购', factor: '事实准确性', source: 'F4 / GS7', executionTarget: '官网 · 切割精度参数页', acceptance: '正文统一使用已确认的 ±0.05mm 精度，关键参数可被搜索引擎与 AI 读取。' }, methods: ['事实纠错', '参数结构化', '事实库对齐'], knowledge: [], output: '' },
      ],
      knowledge: [],
      output: {
        title: 'APW 水刀切割精度说明',
        body: '<h2>切割精度说明</h2><p>APW 水刀切割设备的切割精度为 ±0.1mm，可满足碳纤维与航空复材的切割需求。</p><h2>参数说明</h2><p>设备采用五轴联动，支持常见厚度范围内的直线与曲线切割。</p><h2>待确认事项</h2><p>发布前需确认适用材料、设备配置与测试条件。</p>',
        revision: 2,
      },
      reviews: [
        { time: '2026-09-30T10:20:00.000Z', actor: 'AI 建站', note: 'GEO 验证未通过：正文仍保留 ±0.1mm 旧参数，与已确认事实不一致。' },
      ],
      site: {
        requirements: '统一 ±0.05mm 精度表述，并将关键参数整理为可读取的结构化数据。',
        attempts: 1,
        simulateFailure: true,
        preview: '',
        result: '验证未通过：正文仍保留 ±0.1mm 旧参数，与已确认的 ±0.05mm 事实不一致；参数未形成可被机器读取的结构化数据。',
        targetSite: 'APW 水刀切割网站',
        targetPage: '切割精度参数页',
        changeType: '官网内容新增 / 更新',
        factBoundary: '使用客户终审版本；精度参数以已确认的产品事实库为准，不得扩写未确认的材料、设备配置和服务承诺。',
        acceptance: '正文统一使用 ±0.05mm 精度，关键参数可被搜索引擎与 AI 读取。',
      },
      url: '',
    },
  },
  { id: 'T-2403', name: '核心产品页结构化数据修复', type: 'repair', source: 'F7-1 / F7-2 · 官网 GEO 体检', strategy: '不经过候选策略', persona: '不适用', factor: '机器可读性', methods: ['Product Schema', 'FAQ Schema'], destination: 'AI 官网协同', progress: 'human', relatedStrategies: [], baselineVersion: 'V2', strategyWindow: '09/14–09/20' },
]

export function cloneGeoTask(task: GeoTask): GeoTask {
  return {
    ...task,
    methods: [...task.methods],
    relatedStrategies: [...task.relatedStrategies],
    workflow: task.workflow ? JSON.parse(JSON.stringify(task.workflow)) as TaskWorkflow : undefined,
  }
}

export function displayObjectCodes(value: string) {
  const auditCount = Math.max(6, auditFindings.filter(finding => !['advice', 'knowledge'].includes(finding.route)).length)
  return value
    .replace(/\bAF-(\d+)\b/g, (_match, number: string) => `F-${Number(number)}`)
    .replace(/\bGS(\d+)\b/g, (_match, number: string) => `S-${Number(number)}`)
    .replace(/\bF(\d+)\b/g, (_match, number: string) => `F-${auditCount + Number(number)}`)
}

export function filterStrategies(items: Strategy[], layer: StrategyLayer) {
  return layer === '全部' ? items : items.filter(item => item.layer === layer)
}

export function filterTasks(items: GeoTask[], filter: TaskFilter) {
  return filter === 'all' ? items : items.filter(item => item.type === filter)
}

export function nextProgress(progress: TaskProgress): TaskProgress {
  const order: TaskProgress[] = ['todo', 'running', 'client_content_review', 'human', 'client_review', 'recheck', 'done']
  return order[Math.min(order.indexOf(progress) + 1, order.length - 1)]
}

export function progressLabel(progress: TaskProgress) {
  return { brief: '待确认 Brief', todo: '待执行', running: '执行中', client_content_review: '待确认文案', human: '待人工处理', client_review: '待客户审核', publish: '待发布确认', site_submit: '待提交 AI 建站', site_submitted: '待官网审核', site_running: 'AI 建站执行中', site_returned: '官网已返回处理结果', site_verifying: 'GEO 验证中', site_publish: '发布门禁确认', site_failed: '验证未通过', recheck: '待复测', done: '已完成' }[progress]
}

