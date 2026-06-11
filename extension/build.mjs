/**
 * esbuild bundler for the MV3 extension.
 *
 * Outputs everything Chrome needs into `dist/`:
 *   dist/background.js      (service worker)
 *   dist/contentScript.js   (DOM scraper, injected per-tab)
 *   dist/popup.js + popup.css
 *   dist/popup.html         (copied)
 *   dist/manifest.json      (copied)
 *
 * Configuration (API + Supabase endpoints) is injected at build time via env
 * vars so no values are hard-coded into source. The Supabase ANON key is a
 * public client key — safe to bundle. NEVER put the service-role key here.
 *
 * Usage:
 *   npm run build
 *   npm run watch
 *   SIY_API_BASE_URL=https://api.example.com SIY_WEB_APP_URL=https://app.example.com \
 *   SIY_SUPABASE_URL=... SIY_SUPABASE_ANON_KEY=... npm run build
 */
import * as esbuild from 'esbuild'
import { rmSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = resolve(__dirname, 'dist')
const watch = process.argv.includes('--watch')

const env = {
  __SIY_API_BASE_URL__: process.env.SIY_API_BASE_URL || 'http://localhost:8000',
  __SIY_WEB_APP_URL__: process.env.SIY_WEB_APP_URL || 'http://localhost:3000',
  __SIY_SUPABASE_URL__: process.env.SIY_SUPABASE_URL || 'https://your-project.supabase.co',
  __SIY_SUPABASE_ANON_KEY__: process.env.SIY_SUPABASE_ANON_KEY || 'your-anon-key',
}

const define = Object.fromEntries(
  Object.entries(env).map(([k, v]) => [k, JSON.stringify(v)]),
)
// Compile React in production mode (drops dev warnings, enables minification
// to dead-code-eliminate them) unless we're in watch/dev mode.
define['process.env.NODE_ENV'] = JSON.stringify(watch ? 'development' : 'production')

if (existsSync(dist)) rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: {
    background: 'src/background.ts',
    contentScript: 'src/contentScript.ts',
    popup: 'src/popup/main.tsx',
  },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: ['chrome110'],
  jsx: 'automatic',
  minify: !watch,
  sourcemap: watch,
  define,
  loader: { '.css': 'css' },
  logLevel: 'info',
}

function copyStatic() {
  copyFileSync(resolve(__dirname, 'manifest.json'), resolve(dist, 'manifest.json'))
  copyFileSync(resolve(__dirname, 'src/popup/popup.html'), resolve(dist, 'popup.html'))
}

if (watch) {
  const ctx = await esbuild.context(options)
  await ctx.rebuild()
  copyStatic()
  await ctx.watch()
  console.log('[siy-extension] watching for changes…')
} else {
  await esbuild.build(options)
  copyStatic()
  console.log('[siy-extension] build complete -> dist/')
}
