import build from '@hono/vite-build/netlify-functions'
import devServer from '@hono/vite-dev-server'
import { defineConfig, loadEnv } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

// Helper to load key=value pairs from .dev.vars or .env files for local dev
function getLocalEnv(): Record<string, string> {
  const env: Record<string, string> = {}

  // 1. Load from .dev.vars if present (preserves existing Cloudflare/local secrets file)
  const devVarsPath = path.resolve(process.cwd(), '.dev.vars')
  if (fs.existsSync(devVarsPath)) {
    const lines = fs.readFileSync(devVarsPath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim()
        env[key] = val
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }

  // 2. Load from .env / .env.local if present via Vite's loadEnv
  const viteEnv = loadEnv('', process.cwd(), '')
  for (const [key, val] of Object.entries(viteEnv)) {
    if (!env[key]) {
      env[key] = val
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }

  return env
}

export default defineConfig(() => {
  const localEnv = getLocalEnv()

  return {
    plugins: [
      build({
        entry: 'src/index.tsx',
        outputDir: 'netlify/functions',
        output: 'index.mjs'
      }),
      devServer({
        entry: 'src/index.tsx',
        env: localEnv
      })
    ],
    build: {
      copyPublicDir: false
    }
  }
})
