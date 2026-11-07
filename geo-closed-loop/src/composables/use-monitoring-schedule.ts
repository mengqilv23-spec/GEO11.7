import type { MonitoringSchedule } from '../api/monitoring'
import { ref } from 'vue'
import { getSchedule, pauseMonitoring, resumeMonitoring, saveSchedule as saveScheduleApi } from '../api/monitoring'

export function useMonitoringSchedule() {
  const schedule = ref<MonitoringSchedule | null>(null)
  const enabled = ref(false)
  const loading = ref(false)
  const pending = ref(false)
  const saving = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      schedule.value = await getSchedule()
      enabled.value = schedule.value?.enabled === 1
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : '监测计划加载失败'
    }
    finally {
      loading.value = false
    }
  }

  async function toggle(): Promise<boolean> {
    if (pending.value)
      return false
    pending.value = true
    error.value = ''
    try {
      if (enabled.value)
        await pauseMonitoring()
      else
        await resumeMonitoring()
      enabled.value = !enabled.value
      if (schedule.value)
        schedule.value = { ...schedule.value, enabled: enabled.value ? 1 : 0 }
      return true
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : '监测状态更新失败'
      return false
    }
    finally {
      pending.value = false
    }
  }

  async function save(input: { scheduleType: MonitoringSchedule['scheduleType'], executeTime: string }) {
    if (saving.value)
      return false
    saving.value = true
    error.value = ''
    try {
      const repeatCount = schedule.value?.repeatCount ?? 1
      await saveScheduleApi({ ...input, repeatCount })
      await load()
      return !error.value
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : '监测计划保存失败'
      return false
    }
    finally {
      saving.value = false
    }
  }

  return { schedule, enabled, loading, pending, saving, error, load, toggle, save }
}

