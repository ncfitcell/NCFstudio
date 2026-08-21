import build from '@hono/vite-build/netlify-functions'
import devServer from '@hono/vite-dev-server'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    build({
      entry: 'src/index.tsx',
      outputDir: 'netlify/functions'
    }),
    devServer({
      entry: 'src/index.tsx'
    })
  ],
  build: {
    copyPublicDir: false
  }
})
