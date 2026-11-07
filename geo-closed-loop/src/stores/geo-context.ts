import type { MarketEntryStatus } from '../api/geo-config'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMarketEntryStatus } from '../api/geo-config'

function parsePositiveId(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export const useGeoContextStore = defineStore('geo-context', () => {
  const siteId = ref<string | null>(null)
  const marketId = ref<number | null>(null)
  const entryStatus = ref<MarketEntryStatus | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref('')
  let initializationPromise: Promise<void> | null = null

  function initialize(): Promise<void> {
    if (initialized.value)
      return Promise.resolve()
    if (initializationPromise)
      return initializationPromise

    loading.value = true
    error.value = ''
    initializationPromise = (async () => {
      try {
        const [marketEntry] = await Promise.all([getMarketEntryStatus()])
        siteId.value = 'demo-site-apw'
        marketId.value = parsePositiveId(marketEntry.marketId)
        entryStatus.value = marketEntry
        initialized.value = true
      }
      catch (cause) {
        siteId.value = null
        marketId.value = null
        entryStatus.value = null
        error.value = cause instanceof Error ? cause.message : '用户和市场信息加载失败'
        throw cause
      }
      finally {
        loading.value = false
        initializationPromise = null
      }
    })()

    return initializationPromise
  }

  async function refreshEntryStatus() {
    const status = await getMarketEntryStatus()
    entryStatus.value = status
    marketId.value = parsePositiveId(status.marketId)
    return status
  }

  return {
    siteId,
    marketId,
    entryStatus,
    initialized,
    loading,
    error,
    initialize,
    refreshEntryStatus,
  }
})

