import build from '@hono/vite-build/netlify-functions'
import devServer from '@hono/vite-dev-server'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    build({
      entry: 'src/index.tsx',
    }),
    devServer({
      entry: 'src/index.tsx'
    })
  ]
})
