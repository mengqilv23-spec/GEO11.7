import type { BuyerPersonaRecord, GeoDictionaryItem, GeoMarket, MarketThemeRecord, MonitoringQuestionRecord, SelectedPlatformRecord } from '../api/geo-config'

export interface MonitoringOverviewMetric {
  label: string
  value: number | string | null | undefined
  suffix?: string
}

export interface MonitoringOverviewMetricsInput {
  market: string
  personas: BuyerPersonaRecord[] | null
  questions: MonitoringQuestionRecord[] | null
  themes: MarketThemeRecord[] | null
  platforms: SelectedPlatformRecord[] | null
  totalSample: number | null | undefined
}

export interface MarketLanguageLabels {
  market: string
  language: string
}

export function toMonitoringOverviewMetrics(input: MonitoringOverviewMetricsInput): MonitoringOverviewMetric[] {
  const activeQuestions = input.questions?.filter(item => item.status === 1) ?? null
  const activeThemes = input.themes?.filter(item => item.status === 1) ?? null

  return [
    { label: '市场 / 语言', value: input.market },
    { label: '买家人设', value: input.personas?.filter(item => item.status === 1).length, suffix: ' 类' },
    { label: '意图', value: activeQuestions ? new Set(activeQuestions.map(item => item.intentType).filter(Boolean)).size : null, suffix: ' 类' },
    { label: '关键词', value: activeThemes?.length, suffix: ' 个' },
    { label: '采样总数', value: input.totalSample },
    { label: 'AI 平台', value: input.platforms?.filter(item => item.enabled === 1).length, suffix: ' 个' },
  ]
}

export function formatMarketLanguage(marketId: number | null, markets: GeoMarket[] | null, countries: GeoDictionaryItem[] | null, languages: GeoDictionaryItem[] | null): string {
  const labels = marketLanguageLabels(marketId, markets, countries, languages)
  return [labels.market, labels.language].filter(Boolean).join(' / ')
}

export function marketLanguageLabels(marketId: number | null, markets: GeoMarket[] | null, countries: GeoDictionaryItem[] | null, languages: GeoDictionaryItem[] | null): MarketLanguageLabels {
  const market = markets?.find(item => item.id === marketId)
  if (!market)
    return { market: '', language: '' }

  return {
    market: dictionaryLabel(market.marketCountry, countries),
    language: dictionaryLabel(market.marketLanguage, languages),
  }
}

function dictionaryLabel(value: string | null, items: GeoDictionaryItem[] | null): string {
  if (!value)
    return ''
  return items?.find(item => item.dictValue.toLowerCase() === value.toLowerCase())?.dictLabel ?? value
}

