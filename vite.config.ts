import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Der Base-Path muss dem Repository-Namen entsprechen, z.B. '/museum-wiki/'
// Bei einer Custom Domain oder einer user.github.io-Seite auf '/' setzen.
export default defineConfig({
  plugins: [react()],
  base: '/DFM-Wiki/',
  build: {
    outDir: 'dist'
  }
})
