import { describe, expect, it, vi } from 'vitest'

vi.mock('pinia', () => ({ createPinia: vi.fn(() => ({})) }))
vi.mock('vue', () => ({ createApp: vi.fn(() => ({ use: vi.fn().mockReturnThis(), mount: vi.fn() })) }))
vi.mock('./router', () => ({ default: {} }))
vi.mock('./App.vue', () => ({ default: {} }))

describe('standalone bootstrap', () => {
  it('mounts the Vue app directly without a delegated session or host bridge', async () => {
    await import('./main')
    const { createApp } = await import('vue')
    expect(createApp).toHaveBeenCalledOnce()
  })
})

