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
 * Configuration (API + Supabase endpoints) is injected at build time so no
 * values are hard-coded into source. The Supabase ANON key is a public client
 * key — safe to bundle. NEVER put the service-role key here.
 *
 * Config is resolved with this precedence (later overrides earlier):
 *   1. Built-in dev defaults (localhost).
 *   2. ../frontend/.env.local, mapping NEXT_PUBLIC_* → SIY_* so a plain build
 *      automatically reuses the web app's local Supabase config.
 *   3. ./.env (SIY_* keys) — extension-specific overrides, gitignored.
 *   4. process.env (SIY_* set on the command line) — wins, for CI/one-offs.
 *
 * Usage:
 *   npm run build
 *   npm run watch
 *   SIY_API_BASE_URL=https://api.example.com SIY_WEB_APP_URL=https://app.example.com \
 *   SIY_SUPABASE_URL=... SIY_SUPABASE_ANON_KEY=... npm run build
 */
import * as esbuild from 'esbuild'
import { rmSync, mkdirSync, copyFileSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = resolve(__dirname, 'dist')
const watch = process.argv.includes('--watch')

/** Minimal .env parser: `KEY=value`, ignores blanks/comments, strips quotes. */
function parseEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

const stripSlash = (v) => (typeof v === 'string' ? v.replace(/\/+$/, '') : v)
const firstDefined = (...vals) => vals.find((v) => v !== undefined && v !== '')

const defaults = {
  SIY_API_BASE_URL: 'http://localhost:8000',
  SIY_WEB_APP_URL: 'http://localhost:3000',
  SIY_SUPABASE_URL: 'https://your-project.supabase.co',
  SIY_SUPABASE_ANON_KEY: 'your-anon-key',
}

// Reuse the web app's local config so `npm run build` "just works" in dev.
const frontendEnv = parseEnvFile(resolve(__dirname, '../frontend/.env.local'))
const fromFrontend = {
  SIY_API_BASE_URL: frontendEnv.NEXT_PUBLIC_API_URL,
  SIY_SUPABASE_URL: frontendEnv.NEXT_PUBLIC_SUPABASE_URL,
  SIY_SUPABASE_ANON_KEY: frontendEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

// Extension-specific overrides (gitignored).
const extensionEnv = parseEnvFile(resolve(__dirname, '.env'))

const resolveKey = (key) =>
  firstDefined(process.env[key], extensionEnv[key], fromFrontend[key], defaults[key])

const config = {
  __SIY_API_BASE_URL__: stripSlash(resolveKey('SIY_API_BASE_URL')),
  __SIY_WEB_APP_URL__: stripSlash(resolveKey('SIY_WEB_APP_URL')),
  __SIY_SUPABASE_URL__: stripSlash(resolveKey('SIY_SUPABASE_URL')),
  __SIY_SUPABASE_ANON_KEY__: resolveKey('SIY_SUPABASE_ANON_KEY'),
}

// Surface the resolved config (without leaking the anon key) and loudly warn on
// leftover placeholders — a placeholder Supabase URL breaks token refresh with a
// "Failed to fetch" at runtime.
console.log('[siy-extension] resolved config:')
console.log(`  API_BASE_URL = ${config.__SIY_API_BASE_URL__}`)
console.log(`  WEB_APP_URL  = ${config.__SIY_WEB_APP_URL__}`)
console.log(`  SUPABASE_URL = ${config.__SIY_SUPABASE_URL__}`)
console.log(
  `  SUPABASE_ANON_KEY = ${config.__SIY_SUPABASE_ANON_KEY__ === defaults.SIY_SUPABASE_ANON_KEY ? '(placeholder)' : `set (${config.__SIY_SUPABASE_ANON_KEY__.length} chars)`}`,
)
if (
  config.__SIY_SUPABASE_URL__ === defaults.SIY_SUPABASE_URL ||
  config.__SIY_SUPABASE_ANON_KEY__ === defaults.SIY_SUPABASE_ANON_KEY
) {
  console.warn(
    '[siy-extension] WARNING: Supabase config is still a placeholder. Auth/token refresh will fail at runtime.\n' +
      '  Set SIY_SUPABASE_URL / SIY_SUPABASE_ANON_KEY (via env, extension/.env, or frontend/.env.local).',
  )
}

const define = Object.fromEntries(
  Object.entries(config).map(([k, v]) => [k, JSON.stringify(v)]),
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
