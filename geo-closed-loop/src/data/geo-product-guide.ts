export interface GuideStep { title: string, description: string, action: string }
export interface GuideModule { id: string, title: string, introduction: string, route: string, steps: GuideStep[] }

export const geoGuideModules: GuideModule[] = [
  {
    id: 'overview', title: '概览', route: 'overview',
    introduction: '概览先看本轮核心指标，再看不同 AI 平台上的实际表现，帮助你快速判断品牌是否被看见、被推荐和被引用。',
    steps: [
      { title: '核心指标概览：判断整体表现', description: '品牌提及率（SOA）看品牌在回答中出现的比例；推荐率看 AI 是否主动推荐；官网引用率看品牌官网是否成为回答信源；声量份额（SOV）看品牌在同类品牌中的相对声量。还可对比上次和首次监测的变化。', action: '结合当前市场、语言和监测轮次，先判断整体表现与变化方向。' },
      { title: '监测趋势：观察变化是否持续', description: '趋势图按监测轮次呈现核心指标变化，帮助区分单轮波动和持续上升或下降。', action: '将趋势与各平台表现结合，找到变化发生的时间和平台。' },
      { title: '各 AI 平台表现：看清真实差异', description: '按平台查看品牌提及率和官网引用率，并与整体水平对照。不同平台的结果可能不同，这里能看出品牌在哪些 AI 平台更容易被提到或引用。', action: '逐个平台比较表现；点击“查看完整监测数据”可继续核对具体回答。' },
      { title: 'Agent 工作队列：继续采取行动', description: '队列汇总等待确认或处理的事项，把监测发现衔接到竞品确认、策略审核和优化任务。', action: '从待办进入对应模块，查看证据并决定下一步。' },
    ],
  },
  {
    id: 'visibility-monitoring', title: '可见性监测', route: 'visibility-monitoring',
    introduction: '从品牌资料、买家需求到 AI 回答结果，了解各环节能做什么，并找到品牌被看见的机会。左侧导航可随时切换到其他工作模块。',
    steps: [
      { title: '品牌知识：让 AI 了解你', description: '整理品牌、产品和竞争对手信息，为监测提供真实业务背景。', action: '在左侧进入品牌知识，维护品牌资料。' },
      { title: '买家人设：代入目标客户', description: '按买家角色和采购阶段模拟客户视角，观察不同客户如何了解和比较产品。', action: '维护目标买家，结果可按人设比较。' },
      { title: '监测问题：还原真实需求', description: '围绕买家关心的问题观察 AI 如何回答、提及哪些品牌及其推荐依据。', action: '配置监测问题，持续追踪对应回答。' },
      { title: '采样执行：持续收集回答', description: '按计划在选定 AI 平台采集回答，形成可追踪、可比较的监测轮次。', action: '查看采样状态、平台和轮次进度。' },
      { title: '品牌提及分析：看整体表现', description: '通过趋势、平台、人设和竞品维度，了解品牌被提及与推荐的变化。', action: '切换图表维度，判断表现变化发生在哪里。' },
      { title: '问答命中明细：核对具体回答', description: '逐条查看监测问题在各平台的回答、品牌出现情况和官网引用证据。', action: '打开问题明细，确认品牌如何被提及或推荐。' },
      { title: '信源域名追踪：了解引用来源', description: '查看 AI 回答引用了哪些外部域名和页面，以及这些信源与品牌、竞品的关联。', action: '从域名进入引用页面，寻找可建设的内容和信任信号。' },
    ],
  },
  {
    id: 'report-center', title: '报告中心', route: 'report-center',
    introduction: '报告有两种获取方式：系统按监测周期自动生成，也可以随时手动生成最新报告。',
    steps: [
      { title: '自动生成周期报告', description: '系统会按已配置的监测周期生成周报、月报或季报，汇总该周期的监测结果。', action: '在下方报告列表查看已生成的周期报告。' },
      { title: '手动生成最新报告', description: '需要即时查看时，点击“生成最新报告”，系统会基于当前监测配置重新采集并生成报告。', action: '点击右上角“生成最新报告”手动触发。' },
    ],
  },
  {
    id: 'diagnosis', title: '诊断与策略', route: 'diagnosis',
    introduction: '先检查官网是否方便 AI 读取，再从目标买家的视角找出品牌在 AI 回答中的缺口，最后把问题转成可审核的优化策略。',
    steps: [
      { title: '官网 GEO 体检：检查 AI 能否读懂官网', description: '检查抓取与索引、结构化数据、品牌实体和信息一致性，发现可能影响 AI 读取、理解或引用官网内容的问题。', action: '查看检测项与证据，了解官网哪些地方需要修复或补充。' },
      { title: '认知 GAP：发现买家视角的品牌缺口', description: '结合不同买家人设和决策因素分析 AI 的实际回答，并对照竞品表现，找出品牌事实、内容覆盖和竞品比较等方面的差距。', action: '切换买家人设，查看 AI 回答在哪些决策因素上没有充分呈现你的品牌。' },
      { title: '候选策略：审核下一步怎么改', description: '系统根据官网检测问题和认知缺口生成优化策略。你可以核对建议是否准确、是否值得处理，再选择采纳、忽略或暂缓；采纳的策略会进入后续任务。', action: '审核策略内容与优先级，决定哪些进入后续处理。' },
    ],
  },
  {
    id: 'optimization', title: '优化中心', route: 'optimization',
    introduction: '把策略转化后的任务、待办和执行进展集中管理，从任务范围确认到内容交付保留连续的处理记录。',
    steps: [
      { title: '从任务概况开始', description: '任务概况展示类型分布与任务状态统计。任务列表可按类型与状态筛选。', action: '查看概况与统计，筛选需要处理的任务。' },
      { title: '确认 Brief 与执行范围', description: 'Brief 记录任务目标、资料和执行要求，为后续生成与审核提供依据。', action: '在任务中核对 Brief，补充资料后按当前权限确认或反馈。' },
      { title: '确认 Brief，告诉 AI 如何生成', description: '进入待确认任务后，先核对任务目标、买家人设、买家关注点和内容依据。如果内容方向不符合预期，可在“直接告诉 AI”里写一句具体要求，再确认 Brief 生成内容。', action: '检查任务信息与资料；需要调整时补充提示，再点击“确认并生成内容”。' },
    ],
  },
  {
    id: 'task-detail', title: '任务详情与内容审核', route: 'optimization',
    introduction: '围绕一篇内容或一个修复任务，集中核对任务要求、当前版本与审核依据，保留每次处理的来龙去脉。',
    steps: [
      { title: '编辑与 AI 优化', description: '官网内容和外部信源内容均支持编辑；优化选中段落与重新生成文章共享当前角色、当前篇内容的 2 次 AI 调用机会。', action: '先检查剩余次数，再按需要选择段落优化或重新生成。' },
      { title: '结合质检审阅', description: '段落问题与 AI 质检维度提供检查线索，版本和审核记录呈现内容变化与处理历史。', action: '核对标记段落，检查版本差异后提交当前节点的审核决定。' },
      { title: '按任务类型继续流转', description: '不同产品版本与任务类型对应不同审核节点；外部信源成稿交付与外部平台发布是不同环节。', action: '依据任务当前状态执行可用操作，并查看交付或执行记录。' },
    ],
  },
  {
    id: 'operations-review', title: '运营复盘与 Agent 升级', route: 'operations-review',
    introduction: '回看执行记录与监测变化，整理策略和方法的使用情况，为下一轮的工作选择提供参考。',
    steps: [
      { title: '对照执行背景阅读变化', description: '任务执行与监测变化可以放在一起观察，但同期变化本身并不构成单项任务的效果归因。', action: '结合任务时间、内容变更和监测范围阅读复盘。' },
      { title: '审阅方法与经验记录', description: '查看页面提供的方法、经验和 Agent 升级相关记录，核对其适用条件与使用依据。', action: '从具体记录阅读详情，再判断后续工作是否适用。' },
    ],
  },
  {
    id: 'onboarding', title: '品牌知识与初始配置', route: 'onboarding',
    introduction: '整理品牌、产品、竞品与目标市场，为监测问题和后续任务建立可核对的业务背景。',
    steps: [
      { title: '核对品牌与产品事实', description: '品牌名称、官网、产品与竞品资料用于界定分析对象。资料的准确性与完整性影响后续内容的理解背景。', action: '检查已有信息，补充当前业务所需的事实资料。' },
      { title: '检查人设与监测设置', description: '目标市场、语言、人设、问题与平台配置共同界定本轮观察范围。', action: '按页面步骤完成必要配置；使用引导可随时跳过或再次打开。' },
    ],
  },
  {
    id: 'market-setup', title: '新增市场配置', route: 'market-setup',
    introduction: '为不同市场与语言建立独立的观察范围，分别组织对应的品牌背景、人设和监测问题。',
    steps: [
      { title: '确定市场与语言', description: '不同市场的采购语境与问题表达可能不同，市场配置用于区分后续观察的背景。', action: '按页面要求选择市场与语言，再检查对应配置。' },
      { title: '核对本市场的监测范围', description: '检查本市场的人设、问题和平台安排，避免混用其他市场的观察背景。', action: '完成页面所需配置后，切换到该市场查看监测信息。' },
    ],
  },
]

export function guideModuleForRoute(name: unknown) {
  const id = name === 'report-detail' ? 'report-center' : String(name)
  return geoGuideModules.find(module => module.id === id) ?? geoGuideModules[0]!
}

