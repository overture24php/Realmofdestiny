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
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969641/WhatsApp_Image_2026-03-08_at_02.45.48_vzprxp.jpg', // male warrior avatar
  '998d51489ca786ac6d73a705dcfca0031ec6408c.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772967991/WhatsApp_Image_2026-03-08_at_b02.45.48_myjysa.jpg', // female warrior avatar
  '4770ca651dd0578f6de1ef6c86f54909197d45cb.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969649/WhatsApp_Image_2026-03-08_at_02.45.47_zffwjl.jpg', // body/anatomy model - equipment background

  // World & Scenes
  '76192ffe5cc08b1ad78be5c314ff2153fbc28d6d.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772971210/Gemini_Generated_Image_130cxr130cxr130c_apcntr.png', // world map
  'ae028ba374b625e5980bb19e67f15716582dc9ed.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969649/WhatsApp_Image_2026-03-08_at_02.45.47_zffwjl.jpg', // meditation/temple

  // Arena enemies
  'cd9c513007b72d47084accd15367a503756e3ee7.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969717/WhatsApp_Image_2026-03-05_at_11.01.30_ekudga.jpg', // training dummy
  'b078d521c445963cc1f073892adb83151acddc7a.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969668/elit_yqosxe.png', // shadow dweller / elite enemy

  // Weapons
  '33f8542237ebd165d82407ebba5fba13efe9ace6.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969711/pedang_kayu_gz6f00.png', // wooden sword
  '02679c625f92f8d51829a5cd5cd9ea58e015a7b3.png':
    'https://images.unsplash.com/photo-1741380350043-2d36b7571d7f?w=300&q=80', // wooden dagger
  '6d0190772e174cc6681726ec7d5970c3ea1fc2c7.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969703/busur_kayu_p8rpao.png', // wooden bow
  '46421e85081f63043faed33dc80e0b8257d9d658.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969700/tongkat_sihir_kayu_xwgtww.png', // wooden staff

  // Armors & Shields
  '9041b2fafd4690a5a25156fe365eb52e54d75700.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969696/prisai_kayu_wfr2i9.png', // wooden shield
  'e4b701164a5699c3e67b66ab524713018290122f.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969691/armor_kulit_uggtuq.png', // leather armor
  'dbeb3bc81e2e5bc42ad612200393bebe28bfbf01.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969685/celana_kulit_h989j1.png', // leather pants
  'ac9f6cb3f229f69a68c6372dbc7c501f2166396a.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969680/sepatu_kulit_abrqcg.png', // leather boots
  'd71c2d96757c5e22ffc2b755cb0287bd8bf794e9.png':
    'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969659/Gemini_Generated_Image_o43iypo43iypo43i_ttfgxu.png', // leather helm
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