import type { Priority } from './geo-data'

export const priorityOptions: Array<{ value: Priority, label: string, description: string }> = [
  { value: 'P0', label: 'P0 · 紧急', description: '出现负面或不实信息，或核心业务在主要 AI 引擎中完全不可见、被屏蔽。' },
  { value: 'P1', label: 'P1 · 严重', description: '关键页面缺少必要的结构化数据或关键信息，影响 AI 理解与引用。' },
  { value: 'P2', label: 'P2 · 一般', description: '常规 GEO 优化，影响部分主题或长尾场景的覆盖与表现。' },
  { value: 'P3', label: 'P3 · 轻微', description: '体验优化、实验性平台探索或低价值长尾优化，不承诺处理时限。' },
]

