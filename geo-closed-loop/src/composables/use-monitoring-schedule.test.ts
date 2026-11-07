import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getSchedule: vi.fn(),
  pauseMonitoring: vi.fn(),
  resumeMonitoring: vi.fn(),
  saveSchedule: vi.fn(),
}))
vi.mock('../api/monitoring', () => api)

describe('useMonitoringSchedule', () => {
  beforeEach(() => {
    api.getSchedule.mockReset()
    api.pauseMonitoring.mockReset()
    api.resumeMonitoring.mockReset()
    api.saveSchedule.mockReset()
  })

  it('loads server enabled state and preserves an unconfigured schedule as null', async () => {
    const { useMonitoringSchedule } = await import('./use-monitoring-schedule')
    const state = useMonitoringSchedule()
    api.getSchedule.mockResolvedValueOnce({ id: 7, enabled: 1 }).mockResolvedValueOnce(null)

    await state.load()
    expect(state.enabled.value).toBe(true)
    expect(state.schedule.value).toMatchObject({ id: 7 })
    await state.load()
    expect(state.schedule.value).toBeNull()
    expect(state.enabled.value).toBe(false)
  })

  it('changes local status only after the server accepts pause or resume', async () => {
    const { useMonitoringSchedule } = await import('./use-monitoring-schedule')
    const state = useMonitoringSchedule()
    state.enabled.value = true
    api.pauseMonitoring.mockRejectedValueOnce(new Error('暂停失败')).mockResolvedValueOnce(undefined)
    api.resumeMonitoring.mockResolvedValueOnce(undefined)

    await expect(state.toggle()).resolves.toBe(false)
    expect(state.enabled.value).toBe(true)
    expect(state.error.value).toBe('暂停失败')
    await expect(state.toggle()).resolves.toBe(true)
    expect(state.enabled.value).toBe(false)
    await expect(state.toggle()).resolves.toBe(true)
    expect(state.enabled.value).toBe(true)
  })

  it('persists schedule settings to the backend and reloads its authoritative state', async () => {
    const { useMonitoringSchedule } = await import('./use-monitoring-schedule')
    const state = useMonitoringSchedule()
    state.schedule.value = { id: 8, scheduleType: 'weekly', executeTime: '05:00', repeatCount: 3, enabled: 1, timezone: 'Asia/Shanghai', nextFireTime: null, lastFireTime: null, lastExecuteStatus: null, lastRoundId: null }
    api.saveSchedule.mockResolvedValue(12)
    api.getSchedule.mockResolvedValue({ id: 12, scheduleType: 'monthly', executeTime: '09:30', repeatCount: 3, enabled: 1, timezone: 'Asia/Shanghai', nextFireTime: null, lastFireTime: null, lastExecuteStatus: null, lastRoundId: null })

    await expect(state.save({ scheduleType: 'monthly', executeTime: '09:30' })).resolves.toBe(true)
    expect(api.saveSchedule).toHaveBeenCalledWith({ scheduleType: 'monthly', executeTime: '09:30', repeatCount: 3 })
    expect(state.schedule.value).toMatchObject({ id: 12, scheduleType: 'monthly', executeTime: '09:30' })
  })

  it('does not report success or replace persisted state when schedule save fails', async () => {
    const { useMonitoringSchedule } = await import('./use-monitoring-schedule')
    const state = useMonitoringSchedule()
    api.saveSchedule.mockRejectedValue(new Error('保存失败'))

    await expect(state.save({ scheduleType: 'weekly', executeTime: '05:00' })).resolves.toBe(false)
    expect(state.error.value).toBe('保存失败')
    expect(api.getSchedule).not.toHaveBeenCalled()
  })
})

