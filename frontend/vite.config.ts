import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, createReadStream, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

// Serves the generated files from the repo root in dev and copies them into dist/ on build
const DATA_FILES = [
  { name: 'guide.xml', type: 'application/xml' },
  { name: 'lineup.json', type: 'application/json' }
]

function dataFilesPlugin(): Plugin {
  return {
    name: 'epg-data-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = DATA_FILES.find(f => req.url?.split('?')[0] === `/${f.name}`)
        const path = file && resolve(__dirname, '..', file.name)
        if (file && path && existsSync(path)) {
          res.setHeader('Content-Type', file.type)
          createReadStream(path).pipe(res)
          return
        }
        next()
      })
    },
    closeBundle() {
      for (const file of DATA_FILES) {
        const source = resolve(__dirname, '..', file.name)
        if (existsSync(source)) {
          copyFileSync(source, resolve(__dirname, 'dist', file.name))
          console.log(`✓ ${file.name} copied to dist/`)
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), dataFilesPlugin()],
  base: './'
})
