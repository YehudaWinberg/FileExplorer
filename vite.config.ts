import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    // mods/ and rtl-hebrew/ have their own runner (imports 'claude-code/testing'):
    // `claude plugin test mods/<name>`
    exclude: [...configDefaults.exclude, 'mods/**', 'rtl-hebrew/**'],
  },
})
