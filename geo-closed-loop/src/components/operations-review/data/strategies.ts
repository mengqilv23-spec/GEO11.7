export const strategies = [
  {
    "id": "GS1",
    "title": "碳纤维方案页品牌显影：对比表 + FAQ + 品牌实体加密",
    "layer": "内容",
    "priority": "P0",
    "description": "在碳纤维方案页补充可引用的对比表、FAQ 与品牌实体信息，让 AI 在引用页面时准确识别品牌。",
    "evidence": "页面被 Perplexity 引为来源，但回答只推荐 Flow",
    "source": "F1",
    "persona": "复材技术负责人、复材初创",
    "factor": "无热影响区 / 品牌显影",
    "methods": [
      "对比表 / 定义框 / Q&A",
      "统计数据注入",
      "JSON-LD sameAs / Product / FAQ"
    ],
    "personaIds": [
      "engineering"
    ],
    "gapNames": [
      "认证与合规",
      "维护难度"
    ],
    "confirmed": false
  },
  {
    "id": "GS8",
    "title": "CompositesWorld 投稿《碳纤维切割工艺对比》",
    "layer": "外部信源",
    "priority": "P1",
    "description": "准备行业媒体长稿，使用统计数据与专家引语补充高价值第三方信源。",
    "evidence": "82.9% 引用来自第三方；CompositesWorld 高频且我方零提及",
    "source": "F5",
    "persona": "复材技术负责人、复材初创",
    "factor": "无热影响区 / 第三方信任",
    "methods": [
      "行业媒体长稿",
      "统计数据注入",
      "专家引语"
    ],
    "personaIds": [
      "engineering"
    ],
    "gapNames": [],
    "confirmed": false
  },
  {
    "id": "GS9",
    "title": "LinkedIn工程师专栏 + r/Machinists回答草稿",
    "layer": "外部信源",
    "priority": "P1",
    "description": "围绕真实选型问题准备工程师专栏与社区回答草稿，补充可验证的专业观点。",
    "evidence": "Perplexity 中 Reddit / r/Machinists 高频出现",
    "source": "F5",
    "persona": "复材技术负责人",
    "factor": "价格与TCO",
    "methods": [
      "社区真实讨论",
      "专家引语",
      "选型问答"
    ],
    "personaIds": [
      "engineering"
    ],
    "gapNames": [],
    "confirmed": false
  },
  {
    "id": "GS6",
    "title": "交期与产能页：标准交期区间 + 德国服务网络 SLA",
    "layer": "内容",
    "priority": "P0",
    "description": "以胶囊答案、产能数据和服务范围说明补齐交付稳定性证据，所有业务承诺由客户在 Brief 中确认。",
    "evidence": "人设重视 100 · 我方 35 · 竞对 70；负面叙事被 2 个引擎复述",
    "source": "F3",
    "persona": "汽车Tier-1、航空采购",
    "factor": "交期与产能",
    "methods": [
      "40–60字胶囊答案",
      "统计数据注入",
      "权威语态",
      "对比表 / Q&A"
    ],
    "personaIds": [
      "procurement"
    ],
    "gapNames": [
      "本地服务与培训",
      "交期与产能",
      "交付稳定性",
      "供应链风险",
      "本地服务",
      "代理支持",
      "交期稳定"
    ],
    "confirmed": false
  },
  {
    "id": "GS7",
    "title": "切割精度事实纠错：统一±0.05mm并结构化参数",
    "layer": "内容",
    "priority": "P0",
    "description": "对齐已确认的产品事实库，统一精度参数并形成可直接引用的结构化信息。",
    "evidence": "ChatGPT 错写 ±0.1mm",
    "source": "F4",
    "persona": "航空采购",
    "factor": "事实准确性",
    "methods": [
      "事实纠错",
      "参数结构化",
      "事实库对齐"
    ],
    "personaIds": [
      "procurement"
    ],
    "gapNames": [],
    "confirmed": false
  },
  {
    "id": "GS4",
    "title": "JP市场日语内容补齐：日语问答与采购决策内容",
    "layer": "内容",
    "priority": "P0",
    "description": "补齐日本市场采购问答、本地服务与代理支持内容，覆盖当前未命中的日语问题。",
    "evidence": "JP 市场 6 条日语提问全线未命中",
    "source": "F2",
    "persona": "日本商社",
    "factor": "本地服务 / 代理支持",
    "methods": [
      "日语本地化",
      "Q&A",
      "市场内容覆盖"
    ],
    "personaIds": [
      "plant"
    ],
    "gapNames": [
      "本地服务与培训",
      "本地服务",
      "代理支持"
    ],
    "confirmed": false
  },
  {
    "id": "GS5",
    "title": "产品页结构优化：胶囊答案 + 提问式H2 + 800 token切片",
    "layer": "结构",
    "priority": "P1",
    "description": "调整页面答案结构与标题层次，围绕问题组织完整内容片段，提升 AI 提取与引用的完整性。",
    "evidence": "AI 只能截取碎片而非整段引用",
    "source": "F6",
    "persona": "车间主管",
    "factor": "操作效率",
    "methods": [
      "胶囊答案",
      "提问式H2",
      "内容切片"
    ],
    "personaIds": [
      "distributor"
    ],
    "gapNames": [
      "维护难度"
    ],
    "confirmed": false
  },
  {
    "id": "EXT-YT",
    "title": "YouTube 试切演示视频描述实体化 + 章节时间戳",
    "layer": "外部信源",
    "priority": "P2",
    "description": "为试切演示准备品牌、型号、参数说明和章节时间戳，形成易于检索和引用的视频描述。",
    "evidence": "来源图谱显示视频是当前行业可建设的高价值第三方信源",
    "source": "F5",
    "persona": "车间主管、复材技术负责人",
    "factor": "切割精度 / 可操作性",
    "methods": [
      "视频描述优化",
      "品牌 / 型号 / 参数实体",
      "章节时间戳"
    ],
    "personaIds": [
      "distributor",
      "engineering"
    ],
    "gapNames": [
      "培训成本"
    ],
    "confirmed": false
  },
  {
    "id": "GS10",
    "title": "交期与产能页：补充航空采购 FAQ 与产能表",
    "layer": "内容",
    "priority": "P1",
    "description": "在交期与产能页补充航空采购问答、产能表和采购核对项，由 Agent 判断是否复用已有任务。",
    "evidence": "与 GS6 指向同一页面、同一目标和同类动作，仅补充同一采购场景的信息结构。",
    "source": "F3",
    "persona": "航空采购",
    "factor": "交付稳定性",
    "methods": [
      "交期 FAQ",
      "产能表",
      "采购核对项"
    ],
    "personaIds": [
      "procurement"
    ],
    "gapNames": [
      "交期与产能",
      "交付稳定性",
      "供应链风险",
      "交期稳定",
      "维护难度",
      "停机风险"
    ],
    "confirmed": false
  },
  {
    "id": "GS11",
    "title": "交期页增加汽车工艺停机风险与服务问答",
    "layer": "内容",
    "priority": "P1",
    "description": "补充停机风险、服务保障和车间场景问答，新增范围在后续 Brief 中确认。",
    "evidence": "与现有交期任务目标页相同，但新增人设、决策因子和内容方法，需要专业判断执行范围。",
    "source": "F3 / F6",
    "persona": "汽车工艺、车间主管",
    "factor": "停机风险 / 服务",
    "methods": [
      "停机风险 Q&A",
      "服务问答",
      "买家场景补充"
    ],
    "personaIds": [
      "distributor"
    ],
    "gapNames": [
      "本地服务与培训",
      "交期与产能",
      "交付稳定性",
      "供应链风险",
      "本地服务",
      "代理支持",
      "交期稳定",
      "停机风险"
    ],
    "confirmed": false
  },
  {
    "id": "GS12",
    "title": "欧洲服务响应主题稿：补充服务承诺与适用范围",
    "layer": "外部信源",
    "priority": "P0",
    "description": "准备欧洲服务响应主题稿，明确服务承诺与市场边界，客户确认业务事实后作为最终内容交付。",
    "evidence": "Agent 发现可并入既有行业稿件，但会新增欧洲服务响应承诺与适用市场范围，属于业务事实和内容范围变化。",
    "source": "F3 / F5",
    "persona": "航空采购、汽车工艺",
    "factor": "售后响应 / 供应链风险",
    "methods": [
      "服务范围说明",
      "业务事实核验",
      "适用市场边界"
    ],
    "personaIds": [
      "procurement"
    ],
    "gapNames": [
      "本地服务与培训",
      "供应链风险",
      "本地服务",
      "代理支持"
    ],
    "confirmed": false
  },
  {
    "id": "GS13",
    "title": "日本代理合作与本地服务说明页",
    "layer": "内容",
    "priority": "P1",
    "description": "围绕日本商社的代理合作、本地支持和服务范围构建独立说明页。",
    "evidence": "扫描后未找到目标市场、语言、页面和动作均匹配的已有任务，应保持独立执行。",
    "source": "F2",
    "persona": "日本商社",
    "factor": "代理支持 / 本地服务",
    "methods": [
      "日语本地化",
      "代理合作说明",
      "服务范围 Q&A"
    ],
    "personaIds": [
      "plant"
    ],
    "gapNames": [
      "本地服务与培训",
      "本地服务",
      "代理支持"
    ],
    "confirmed": false
  },
  {
    "id": "GS14",
    "title": "工程师专家档案实体统一与同名消歧",
    "layer": "内容",
    "priority": "P1",
    "description": "补充可验证的工程师身份、专业背景和实体关联，统一作者档案并消除同名歧义。",
    "evidence": "2 位工程师已有内容贡献，但缺少可验证作者 / 专家实体档案。",
    "source": "F7",
    "persona": "不适用",
    "factor": "实体可信度",
    "methods": [
      "作者实体",
      "专家档案",
      "sameAs消歧"
    ],
    "gapNames": [
      "认证与合规"
    ],
    "confirmed": false
  }
]


