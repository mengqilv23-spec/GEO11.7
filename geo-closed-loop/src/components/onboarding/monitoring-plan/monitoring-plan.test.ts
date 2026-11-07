import { describe, expect, it } from 'vitest'
import { defaultMonitoringPlatformsForPlan, initialMonitoringPlatforms, monitoringPlatformOptions, toggleMonitoringPlatform } from './monitoring-plan'

describe('monitoring plan', () => {
  it('uses only platform codes supported by the backend contract', () => {
    expect(initialMonitoringPlatforms).toEqual(['google-ai', 'ai-mode', 'gemini'])
    expect(monitoringPlatformOptions.map(platform => platform.label)).toEqual(['AI Overview', 'AI Mode', 'Gemini', 'ChatGPT', 'Claude'])
    expect(monitoringPlatformOptions.at(-1)).toMatchObject({ disabled: true, hint: '敬请期待' })
  })

  it('defaults ChatGPT on for Growth and Professional plans only', () => {
    expect(defaultMonitoringPlatformsForPlan('starter', '入门版')).not.toContain('chatgpt')
    expect(defaultMonitoringPlatformsForPlan('growth', '成长版')).toContain('chatgpt')
    expect(defaultMonitoringPlatformsForPlan('pro', '专业版')).toContain('chatgpt')
  })

  it('toggles a platform without mutating the existing selection', () => {
    const selected = ['chatgpt', 'gemini'] as const

    expect(toggleMonitoringPlatform(selected, 'gemini')).toEqual(['chatgpt'])
    expect(toggleMonitoringPlatform(selected, 'ai-mode')).toEqual(['chatgpt', 'gemini', 'ai-mode'])
    expect(selected).toEqual(['chatgpt', 'gemini'])
  })
})

