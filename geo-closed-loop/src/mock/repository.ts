import type { MockState } from './state'
import { initialReports } from '../data/report-center-data'
import { createSeedState } from './seed'

export const MOCK_STORAGE_KEY = 'geo-agent-web-mock:v1'

function cloneState(state: MockState): MockState {
  return structuredClone(state)
}

function getBrowserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  }
  catch {
    return undefined
  }
}

function save(storage: Storage | undefined, state: MockState): void {
  try {
    storage?.setItem(MOCK_STORAGE_KEY, JSON.stringify(state))
  }
  catch {
    // The demo remains usable in private browsing modes that deny storage access.
  }
}

export function readMockState(storage = getBrowserStorage()): MockState {
  if (!storage)
    return createSeedState()

  try {
    const raw = storage.getItem(MOCK_STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null && 'schemaVersion' in parsed && parsed.schemaVersion === 1 && 'config' in parsed && 'monitoring' in parsed) {
        const state = parsed as MockState
        const migratedReportPrototypes = ensureReportPrototypeFixtures(state)
        const migratedCompetitors = replaceLegacyCompetitors(state)
        const migratedPlatforms = replaceLegacyPlatformFixture(state)
        if (migratedReportPrototypes || migratedCompetitors || migratedPlatforms)
          save(storage, state)
        return cloneState(state)
      }
    }
  }
  catch {
    // A malformed or inaccessible value is replaced with a complete seed below.
  }

  const seed = createSeedState()
  save(storage, seed)
  return cloneState(seed)
}

function ensureReportPrototypeFixtures(state: MockState): boolean {
  if (state.reports.items.some(report => report.type === 'adhoc'))
    return false
  const adhocPrototypeReport = initialReports.find(report => report.type === 'adhoc')
  if (!adhocPrototypeReport)
    return false
  state.reports.items.push(structuredClone(adhocPrototypeReport))
  return true
}

function replaceLegacyPlatformFixture(state: MockState): boolean {
  const oldDefaultPlatforms = ['chatgpt', 'perplexity', 'google-ai', 'gemini', 'ai-mode']
  let changed = false
  const current = Array.isArray(state.config.platforms) ? state.config.platforms : []
  const isOldDefault = current.length === oldDefaultPlatforms.length
    && oldDefaultPlatforms.every((platform, index) => current[index]?.platform === platform && current[index]?.enabled === 1)
  if (isOldDefault) {
    state.config.platforms = createSeedState().config.platforms
    changed = true
  }

  const configuredPlatforms = Array.isArray(state.config.platforms) ? state.config.platforms : []
  const supportedPlatforms = configuredPlatforms.filter(item => !/^perplexity$/i.test(item.platform))
  if (supportedPlatforms.length !== configuredPlatforms.length) {
    state.config.platforms = supportedPlatforms.map((item, index) => ({ ...item, sort: index + 1 }))
    changed = true
  }

  const settingsPlatforms = state.monitoring?.settings?.platforms
  if (Array.isArray(settingsPlatforms)) {
    const supportedSettings = settingsPlatforms.filter(platform => !/^perplexity$/i.test(platform))
    if (supportedSettings.length !== settingsPlatforms.length) {
      state.monitoring.settings.platforms = supportedSettings as typeof state.monitoring.settings.platforms
      changed = true
    }
  }

  if (state.config.recommendations?.some(item => item.platformNames?.some(name => /^perplexity$/i.test(name)))) {
    state.config.recommendations = state.config.recommendations.map(item => ({
      ...item,
      platformNames: item.platformNames?.filter(name => !/^perplexity$/i.test(name)) ?? [],
    }))
    changed = true
  }

  return changed
}

function replaceLegacyCompetitors(state: MockState): boolean {
  const oldFixture: Array<[string, string]> = [
    ['Wix', 'wix.com'],
    ['Squarespace', 'squarespace.com'],
    ['GoDaddy', 'godaddy.com'],
    ['Webflow', 'webflow.com'],
    ['OMAX', 'omax.com'],
  ]
  const current = state.config.competitors.map(item => [item.competitorName, item.domain])
  const matchesOldFixture = current.length === oldFixture.length
    && oldFixture.every(([name, domain]) => current.some(([currentName, currentDomain]) => currentName === name && currentDomain === domain))
  if (!matchesOldFixture)
    return false
  state.config.competitors = createSeedState().config.competitors
  return true
}

export function updateMockState(mutator: (draft: MockState) => void, storage = getBrowserStorage()): MockState {
  const draft = readMockState(storage)
  mutator(draft)
  draft.revision += 1
  save(storage, draft)
  return cloneState(draft)
}

export function resetMockState(storage = getBrowserStorage()): MockState {
  const seed = createSeedState()
  save(storage, seed)
  return cloneState(seed)
}

