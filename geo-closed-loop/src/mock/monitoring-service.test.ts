import { beforeEach, describe, expect, it } from 'vitest'
import { getRounds, getSchedule, pauseMonitoring, resumeMonitoring, saveSchedule, triggerRound } from './monitoring-service'
import { resetMockState } from './repository'

describe('local monitoring workflow', () => {
  beforeEach(() => resetMockState())

  it('reads seeded rounds and schedule without a backend', async () => {
    expect((await getRounds({ pageSize: 1 })).total).toBeGreaterThan(1)
    expect((await getSchedule())?.enabled).toBe(1)
  })

  it('persists pause, resume, schedule changes, and a new sampling round', async () => {
    await pauseMonitoring()
    expect((await getSchedule())?.enabled).toBe(0)
    await resumeMonitoring()
    await saveSchedule({ scheduleType: 'monthly', executeTime: '周三 09:30', repeatCount: 1 })
    expect((await getSchedule())?.executeTime).toBe('周三 09:30')
    const before = (await getRounds()).total
    await triggerRound()
    expect((await getRounds()).total).toBe(before + 1)
  })
})

