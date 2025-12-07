import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

// PDF.js worker dosyasını kopyala
const copyPdfWorker = () => {
  const workerSrc = 'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs'
  const workerDest = 'public/pdfjs/pdf.worker.min.js'

  if (existsSync(workerSrc)) {
    if (!existsSync('public/pdfjs')) {
      mkdirSync('public/pdfjs', { recursive: true })
    }
    copyFileSync(workerSrc, workerDest)
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const assetsBase = env.VITE_ASSETS_BASE_URL?.trim()
  const base = assetsBase ? (assetsBase.endsWith('/') ? assetsBase : `${assetsBase}/`) : '/'

  return {
    base,
    plugins: [
      react(),
      {
        name: 'copy-pdf-worker',
        buildStart() {
          copyPdfWorker()
        }
      }
    ],
    optimizeDeps: {
      include: ['pdfjs-dist']
    },
    preview: {
      port: process.env.PORT ? parseInt(process.env.PORT) : 4173,
      host: true,
      strictPort: false
    },
    build: {
      rollupOptions: {
        external: [],
        output: {
          manualChunks: {
            pdfjs: ['pdfjs-dist'],
            xlsx: ['xlsx'],
            html2canvas: ['html2canvas'],
            vendor: ['papaparse', 'fuzzyset.js']
          }
        }
      }
    }
  }
})
