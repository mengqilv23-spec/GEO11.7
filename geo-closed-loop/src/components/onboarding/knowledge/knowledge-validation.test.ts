import type { KnowledgeItem } from '../../../types'
import { describe, expect, it } from 'vitest'
import { validateKnowledgeItems } from './knowledge-validation'

const validItems: KnowledgeItem[] = [
  {
    id: 'brand',
    index: '01',
    title: '品牌信息',
    summary: '',
    requirements: '',
    brand: { name: 'APW', alias: 'APW Waterjet', industry: '工业制造', description: '水刀切割方案' },
  },
  {
    id: 'product',
    index: '02',
    title: '核心产品',
    summary: '',
    requirements: '',
    products: [{ id: 'p-1', name: '五轴水刀切割系统', useCase: '复材切割', strengths: '', customerGroup: '', isPrimary: true }],
  },
  {
    id: 'market',
    index: '03',
    title: '市场与语言',
    summary: '',
    requirements: '',
    marketLanguage: { market: '德国', language: '德语' },
  },
  {
    id: 'competitor',
    index: '04',
    title: '竞争对手',
    summary: '',
    requirements: '',
    competitors: [{ id: 'c-1', name: 'Flow International', domain: 'flowwaterjet.com', alias: 'Flow', description: '', confirmed: true }],
  },
]

describe('validateKnowledgeItems', () => {
  it('accepts a complete brand, product, market and competitor profile', () => {
    expect(validateKnowledgeItems(validItems)).toBeNull()
  })

  it('requires at least one product and validates its name and use case', () => {
    const items = structuredClone(validItems)
    items[1].products = []
    expect(validateKnowledgeItems(items)).toEqual({ tab: 'product', errors: { products: '至少添加 1 条核心产品' } })

    items[1].products = [{ ...validItems[1].products![0], name: ' ', useCase: '' }]
    expect(validateKnowledgeItems(items)).toEqual({
      tab: 'product',
      errors: { 'product.p-1.name': '请输入核心产品', 'product.p-1.useCase': '请输入使用场景' },
    })
  })

  it('requires a market and language', () => {
    const items = structuredClone(validItems)
    items[2].marketLanguage = { market: '', language: '' }
    expect(validateKnowledgeItems(items)).toEqual({
      tab: 'market',
      errors: { market: '请选择目标市场', language: '请选择语言' },
    })
  })

  it('requires at least one competitor and validates its name and domain', () => {
    const items = structuredClone(validItems)
    items[3].competitors = []
    expect(validateKnowledgeItems(items)).toEqual({ tab: 'competitor', errors: { competitors: '至少添加 1 个竞品' } })

    items[3].competitors = [{ ...validItems[3].competitors![0], name: '', domain: ' ' }]
    expect(validateKnowledgeItems(items)).toEqual({
      tab: 'competitor',
      errors: { 'competitor.c-1.name': '请输入竞品名称', 'competitor.c-1.domain': '请输入竞品域名' },
    })
  })
})

