import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// ── Figma Asset URL Map ────────────────────────────────────────────────────────
// Maps figma:asset/<hash>.png → public CDN URL (Unsplash)
// This allows the project to build outside Figma Make (e.g. Vercel).
// The images are chosen to match the fantasy medieval RPG theme of the game.
const FIGMA_ASSET_MAP: Record<string, string> = {
  // Characters
  '0d288298f55234e645afbd915a4e01469027b0fa.png':
    'https://images.unsplash.com/photo-1576497587501-f71f94bef499?w=400&q=80', // male warrior
  '998d51489ca786ac6d73a705dcfca0031ec6408c.png':
    'https://images.unsplash.com/photo-1686747517763-f9d694bda04d?w=400&q=80', // female warrior/mage
  '4770ca651dd0578f6de1ef6c86f54909197d45cb.png':
    'https://images.unsplash.com/photo-1559116315-702b0b4774ce?w=400&q=80', // body/anatomy model

  // World & Scenes
  '76192ffe5cc08b1ad78be5c314ff2153fbc28d6d.png':
    'https://images.unsplash.com/photo-1691506513931-4740e203d1a0?w=800&q=80', // world map
  'ae028ba374b625e5980bb19e67f15716582dc9ed.png':
    'https://images.unsplash.com/photo-1602855659964-b351a2d94f74?w=600&q=80', // meditation/temple

  // Arena enemies
  'cd9c513007b72d47084accd15367a503756e3ee7.png':
    'https://images.unsplash.com/photo-1645612803796-24d4f4a5a863?w=400&q=80', // training dummy
  'b078d521c445963cc1f073892adb83151acddc7a.png':
    'https://images.unsplash.com/photo-1734122373993-36745ac6b688?w=400&q=80', // elite guard / knight

  // Weapons
  '33f8542237ebd165d82407ebba5fba13efe9ace6.png':
    'https://images.unsplash.com/photo-1672672088809-59acb7ad0e3a?w=300&q=80', // wooden sword
  '02679c625f92f8d51829a5cd5cd9ea58e015a7b3.png':
    'https://images.unsplash.com/photo-1741380350043-2d36b7571d7f?w=300&q=80', // wooden dagger
  '6d0190772e174cc6681726ec7d5970c3ea1fc2c7.png':
    'https://images.unsplash.com/photo-1747492209325-244e307d387f?w=300&q=80', // wooden bow
  '46421e85081f63043faed33dc80e0b8257d9d658.png':
    'https://images.unsplash.com/photo-1547629662-7fe7ac16dbf6?w=300&q=80', // wooden staff

  // Armors & Shields
  '9041b2fafd4690a5a25156fe365eb52e54d75700.png':
    'https://images.unsplash.com/photo-1721619171731-11c14f848bed?w=300&q=80', // wooden shield
  'e4b701164a5699c3e67b66ab524713018290122f.png':
    'https://images.unsplash.com/photo-1600081523138-0bae23488dea?w=300&q=80', // leather armor
  'dbeb3bc81e2e5bc42ad612200393bebe28bfbf01.png':
    'https://images.unsplash.com/photo-1615672969032-45c313ae0a2c?w=300&q=80', // leather pants
  'ac9f6cb3f229f69a68c6372dbc7c501f2166396a.png':
    'https://images.unsplash.com/photo-1615672969032-45c313ae0a2c?w=300&q=80', // leather boots
  'd71c2d96757c5e22ffc2b755cb0287bd8bf794e9.png':
    'https://images.unsplash.com/photo-1689009755226-2b6504a89033?w=300&q=80', // leather helm
}

// ── Vite Plugin: figma:asset → public URL ─────────────────────────────────────
function figmaAssetFallbackPlugin(): Plugin {
  const PREFIX = 'figma:asset/'

  return {
    name: 'figma-asset-fallback',
    enforce: 'pre',

    // Intercept resolution so Vite doesn't throw "unknown scheme"
    resolveId(id: string) {
      if (id.startsWith(PREFIX)) {
        return '\0' + id // virtual module id
      }
      return null
    },

    load(id: string) {
      if (!id.startsWith('\0' + PREFIX)) return null

      const assetFile = id.slice(('\0' + PREFIX).length)
      const url = FIGMA_ASSET_MAP[assetFile] ?? ''

      if (!url) {
        this.warn(`[figma-asset-fallback] No URL mapping for: ${assetFile}`)
      }

      return `export default ${JSON.stringify(url)}`
    },
  }
}

// ── Vite Plugin: handle figma:foundry-client-api (no-op outside Figma Make) ──
function figmaFoundryClientApiPlugin(): Plugin {
  return {
    name: 'figma-foundry-client-api',
    enforce: 'pre',
    resolveId(id: string) {
      if (id === 'figma:foundry-client-api') return '\0figma:foundry-client-api'
      return null
    },
    load(id: string) {
      if (id === '\0figma:foundry-client-api') return 'export default {}'
      return null
    },
  }
}

export default defineConfig({
  plugins: [
    // Figma asset & module stubs must come BEFORE React plugin
    figmaAssetFallbackPlugin(),
    figmaFoundryClientApiPlugin(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      // Support absolute /utils imports (e.g. from '/utils/supabase/info')
      '/utils': path.resolve(__dirname, './utils'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})