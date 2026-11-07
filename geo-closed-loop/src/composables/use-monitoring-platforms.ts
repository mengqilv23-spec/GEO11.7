import type { GeoDictionaryItem, SelectedPlatformRecord } from '../api/geo-config'
import { computed, ref } from 'vue'
import { getDictionary, getMarketPlatforms, removePlatform, selectPlatform } from '../api/geo-config'

export interface MonitoringPlatformOption {
  id: string
  label: string
  enabled: boolean
}

export function useMonitoringPlatforms() {
  const records = ref<SelectedPlatformRecord[]>([])
  const dictionary = ref<GeoDictionaryItem[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const selected = computed(() => records.value.filter(record => record.enabled === 1).map(record => record.platform))
  const options = computed<MonitoringPlatformOption[]>(() => {
    const labels = new Map(dictionary.value.map(item => [item.dictValue, item.dictLabel]))
    const allCodes = new Set([...dictionary.value.map(item => item.dictValue), ...records.value.map(record => record.platform)])
    return [...allCodes].map(id => ({ id, label: labels.get(id) ?? id, enabled: true }))
  })

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const [platformRecords, platformDictionary] = await Promise.all([getMarketPlatforms(), getDictionary('ai_platform')])
      records.value = platformRecords
      dictionary.value = platformDictionary
    }
    catch (cause) {
      records.value = []
      dictionary.value = []
      error.value = cause instanceof Error ? cause.message : 'AI 平台配置加载失败'
    }
    finally {
      loading.value = false
    }
  }

  async function save(nextSelection: readonly string[]) {
    if (saving.value)
      return false
    saving.value = true
    error.value = ''
    const next = new Set(nextSelection)
    try {
      for (const record of records.value) {
        if (record.enabled === 1 && !next.has(record.platform))
          await removePlatform(record.id)
      }
      const previous = new Set(records.value.filter(record => record.enabled === 1).map(record => record.platform))
      for (const platform of next) {
        if (!previous.has(platform))
          await selectPlatform({ platform })
      }
      await load()
      return !error.value
    }
    catch (cause) {
      await load()
      error.value = cause instanceof Error ? cause.message : 'AI 平台配置保存失败'
      return false
    }
    finally {
      saving.value = false
    }
  }

  return { records, options, selected, loading, saving, error, load, save }
}

