import { describe, expect, it } from 'vitest'
import { prototypeTasks } from './geo-data'

describe('prototype task detail entries', () => {
  it('includes the five requested task types in prototype order and starts them at their real states', () => {
    expect(prototypeTasks.map(task => task.name)).toEqual([
      '工程师专家档案实体统一与同名消歧',
      '日本代理合作与本地服务说明页',
      '欧洲服务响应主题稿：补充服务承诺与适用范围',
      '交期页增加汽车工艺停机风险与服务问答',
      '交期与产能页：补充航空采购 FAQ 与产能表',
    ])
    expect(prototypeTasks.map(task => task.type)).toEqual(['repair', 'web', 'external', 'web', 'web'])
    expect(prototypeTasks.map(task => task.progress)).toEqual(['site_running', 'brief', 'brief', 'brief', 'brief'])
    expect(prototypeTasks[0]?.evidence).toContain('正在扫描是否可复用')
  })
})

