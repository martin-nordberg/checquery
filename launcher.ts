import { join } from 'node:path'
import serverConfig from './server/src/index'

const staticDir = process.env['CHECQUERY_STATIC_DIR'] ?? join(import.meta.dir, 'client', 'dist')

// Start the API server
Bun.serve(serverConfig)
console.log(`API server running on http://localhost:${serverConfig.port}`)

// Start the static file (SPA) server
const clientPort = parseInt(process.env['CHECQUERY_CLIENT_PORT'] ?? '3000')
const indexHtml = join(staticDir, 'index.html')

Bun.serve({
    port: clientPort,
    async fetch(req) {
        const url = new URL(req.url)
        const filePath = join(staticDir, url.pathname)
        const file = Bun.file(filePath)
        if (await file.exists()) {
            return new Response(file)
        }
        // Fall back to index.html for SPA client-side routing
        return new Response(Bun.file(indexHtml))
    },
})
console.log(`Client app running on http://localhost:${clientPort}`)
console.log(`Static files: ${staticDir}`)
