import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  test: {
    // Keep worker creation predictable on CI runners and smaller developer
    // machines; the default can spawn more workers than this suite benefits from.
    maxWorkers: 1,
    exclude: [
      ...configDefaults.exclude,
      '**/e2e/**',
    ],
  },
})
