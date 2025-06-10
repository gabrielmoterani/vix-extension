import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      'data-text:~style.css': join(dirname(fileURLToPath(import.meta.url)), 'src/style.css')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx']
  }
})
