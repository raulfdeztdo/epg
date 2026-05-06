import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, createReadStream, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

function guideXmlPlugin(): Plugin {
  const rootGuide = resolve(__dirname, '../guide.xml')

  return {
    name: 'guide-xml',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/guide.xml' && existsSync(rootGuide)) {
          res.setHeader('Content-Type', 'application/xml')
          createReadStream(rootGuide).pipe(res)
          return
        }
        next()
      })
    },
    closeBundle() {
      const distGuide = resolve(__dirname, 'dist/guide.xml')
      if (existsSync(rootGuide)) {
        copyFileSync(rootGuide, distGuide)
        console.log('✓ guide.xml copied to dist/')
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), guideXmlPlugin()],
  base: './'
})
