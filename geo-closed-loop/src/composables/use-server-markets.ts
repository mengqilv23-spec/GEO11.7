import type { GeoDictionaryItem, GeoMarket, MarketEntryStatus, MarketSwitchResult } from '../api/geo-config'
import { computed, readonly, ref } from 'vue'
import { getDictionary, getMarketEntryStatus, getMarkets, switchMarket } from '../api/geo-config'
import { useGeoContextStore } from '../stores/geo-context'

export interface ServerMarketOption {
  id: number
  title: string
  country: string
  language: string
  enabled: boolean
}

function dictionaryLabels(items: GeoDictionaryItem[]) {
  return new Map(items.map(item => [item.dictValue, item.dictLabel]))
}

function displayLabel(value: string | null, labels: Map<string, string>, emptyLabel: string) {
  if (!value)
    return emptyLabel
  return labels.get(value) ?? value
}

function toMarketOption(market: GeoMarket, countries: Map<string, string>, languages: Map<string, string>): ServerMarketOption {
  const country = displayLabel(market.marketCountry, countries, '主站')
  const language = displayLabel(market.marketLanguage, languages, '语言未设置')
  return {
    id: market.id,
    title: `${market.subSiteName || country} · ${language}`,
    country,
    language,
    enabled: market.status === 1,
  }
}

export function useServerMarkets() {
  const items = ref<ServerMarketOption[]>([])
  const activeMarketId = ref<number | null>(null)
  const loading = ref(false)
  const switching = ref(false)
  const error = ref('')
  const activeMarket = computed(() => items.value.find(market => market.id === activeMarketId.value) ?? null)

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const [markets, entry, countries, languages]: [GeoMarket[], MarketEntryStatus, GeoDictionaryItem[], GeoDictionaryItem[]] = await Promise.all([
        getMarkets(),
        getMarketEntryStatus(),
        getDictionary('country'),
        getDictionary('language'),
      ])
      const countryLabels = dictionaryLabels(countries)
      const languageLabels = dictionaryLabels(languages)
      items.value = markets.map(market => toMarketOption(market, countryLabels, languageLabels))
      activeMarketId.value = entry.marketId ?? markets.find(market => market.status === 1)?.id ?? null
    }
    catch (cause) {
      items.value = []
      activeMarketId.value = null
      error.value = cause instanceof Error ? cause.message : '市场列表加载失败'
    }
    finally {
      loading.value = false
    }
  }

  async function activate(marketId: number): Promise<MarketSwitchResult> {
    switching.value = true
    error.value = ''
    try {
      const result = await switchMarket(marketId)
      activeMarketId.value = result.marketId
      const geoContext = useGeoContextStore()
      geoContext.marketId = result.marketId
      geoContext.entryStatus = null
      try {
        await geoContext.refreshEntryStatus()
      }
      catch {
        // A successful market switch should not be reported as failed just because
        // the follow-up entry-status refresh is temporarily unavailable.
      }
      return result
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : '市场切换失败'
      throw cause
    }
    finally {
      switching.value = false
    }
  }

  return {
    items: readonly(items),
    activeMarketId: readonly(activeMarketId),
    activeMarket,
    loading: readonly(loading),
    switching: readonly(switching),
    error: readonly(error),
    load,
    activate,
  }
}

