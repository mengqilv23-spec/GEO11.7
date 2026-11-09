import { fileURLToPath } from 'node:url'
import { env } from 'node:process'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const pagesRepository = env.GITHUB_REPOSITORY?.split('/')[1]

export default defineConfig({
  base: env.GITHUB_ACTIONS === 'true' && pagesRepository ? `/${pagesRepository}/` : '/',
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    setupFiles: [fileURLToPath(new URL('./src/test/setup.ts', import.meta.url))],
    restoreMocks: true,
  },
})

