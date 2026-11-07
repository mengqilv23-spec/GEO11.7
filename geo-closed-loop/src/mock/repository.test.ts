import { beforeEach, describe, expect, it } from 'vitest'
import { MOCK_STORAGE_KEY, readMockState, resetMockState, updateMockState } from './repository'
import { createSeedState } from './seed'

function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

describe('mock repository', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createStorage()
  })

  it('initializes and persists a complete seed state on first read', () => {
    const state = readMockState(storage)

    expect(state.schemaVersion).toBe(1)
    expect(state.config.personas.length).toBeGreaterThan(0)
    expect(state.monitoring.questions.length).toBeGreaterThan(0)
    expect(JSON.parse(storage.getItem(MOCK_STORAGE_KEY)!).revision).toBe(0)
  })

  it('persists updates and returns independent snapshots', () => {
    const updated = updateMockState((state) => {
      state.config.brand.brandName = '本地演示品牌'
    }, storage)
    updated.config.brand.brandName = '外部修改'

    expect(readMockState(storage).config.brand.brandName).toBe('本地演示品牌')
    expect(readMockState(storage).revision).toBe(1)
  })

  it('recovers from malformed or unsupported stored data', () => {
    storage.setItem(MOCK_STORAGE_KEY, '{broken')
    expect(readMockState(storage).schemaVersion).toBe(1)

    storage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ schemaVersion: 999 }))
    expect(readMockState(storage).schemaVersion).toBe(1)
    expect(readMockState(storage).config.brand.brandName).toBeTruthy()
  })

  it('migrates the previous generic competitor fixture to waterjet competitors', () => {
    const legacy = createSeedState()
    legacy.config.competitors = [
      { id: 101, competitorName: 'Wix', domain: 'wix.com', aliasNames: 'Wix', competitorDesc: '', isCoreSov: 1, sourceType: 1, status: 1 },
      { id: 102, competitorName: 'Squarespace', domain: 'squarespace.com', aliasNames: 'Squarespace', competitorDesc: '', isCoreSov: 1, sourceType: 1, status: 1 },
      { id: 103, competitorName: 'GoDaddy', domain: 'godaddy.com', aliasNames: 'GoDaddy', competitorDesc: '', isCoreSov: 1, sourceType: 1, status: 1 },
      { id: 104, competitorName: 'Webflow', domain: 'webflow.com', aliasNames: 'Webflow', competitorDesc: '', isCoreSov: 1, sourceType: 1, status: 1 },
      { id: 105, competitorName: 'OMAX', domain: 'omax.com', aliasNames: 'OMAX', competitorDesc: '', isCoreSov: 1, sourceType: 1, status: 1 },
    ]
    storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(legacy))

    const competitors = readMockState(storage).config.competitors

    expect(competitors.map(item => item.competitorName)).toEqual(['Flow Waterjet', 'OMAX', 'KMT Waterjet', 'WARDJet', 'STM Waterjet'])
    expect(JSON.parse(storage.getItem(MOCK_STORAGE_KEY)!).config.competitors).toHaveLength(5)
  })

  it('migrates the old default platform fixture while preserving custom platform selections', () => {
    const legacy = createSeedState()
    legacy.config.platforms = ['chatgpt', 'perplexity', 'google-ai', 'gemini', 'ai-mode'].map((platform, index) => ({ id: 601 + index, platform, modelVersion: null, enabled: 1, sort: index + 1 }))
    storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(legacy))

    expect(readMockState(storage).config.platforms.map(item => item.platform)).toEqual(['google-ai', 'ai-mode', 'gemini'])

    const customized = createSeedState()
    customized.config.platforms = [{ id: 601, platform: 'chatgpt', modelVersion: null, enabled: 1, sort: 1 }]
    storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(customized))
    expect(readMockState(storage).config.platforms.map(item => item.platform)).toEqual(['chatgpt'])
  })

  it('adds the supplied on-demand report to existing local state without replacing its reports', () => {
    const legacy = createSeedState()
    legacy.reports.items = legacy.reports.items.filter(report => report.type !== 'adhoc')
    legacy.reports.items[0]!.title = '保留用户现有报告'
    storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(legacy))

    const migrated = readMockState(storage)

    expect(migrated.reports.items.some(report => report.title === '保留用户现有报告')).toBe(true)
    expect(migrated.reports.items.filter(report => report.type === 'adhoc')).toHaveLength(1)
    expect(JSON.parse(storage.getItem(MOCK_STORAGE_KEY)!).reports.items.filter((report: { type: string }) => report.type === 'adhoc')).toHaveLength(1)
  })

  it('reset restores the initial seed state', () => {
    updateMockState((state) => {
      state.config.brand.brandName = '已修改'
    }, storage)
    const reset = resetMockState(storage)

    expect(reset.config.brand.brandName).not.toBe('已修改')
    expect(readMockState(storage).revision).toBe(0)
  })
})

