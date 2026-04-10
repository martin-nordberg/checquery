import { join } from 'node:path'
import serverConfig from './server/src/index'

const staticDir = process.env['CHECQUERY_STATIC_DIR'] ?? join(import.meta.dir, 'client', 'dist')

// Start the API server
Bun.serve({ ...serverConfig, hostname: '0.0.0.0' })
console.log(`API server running on http://localhost:${serverConfig.port}`)

// Start the static file (SPA) server
const clientPort = parseInt(process.env['CHECQUERY_CLIENT_PORT'] ?? '3000')
const indexHtml = join(staticDir, 'index.html')

Bun.serve({
    hostname: '0.0.0.0',
    port: clientPort,
    async fetch(req) {
        const url = new URL(req.url)
        const filePath = join(staticDir, url.pathname)
        const file = Bun.file(filePath)
        if (await file.exists()) {
            // Vite produces content-hashed filenames for all assets (JS, CSS, WASM, data).
            // Cache them as immutable so the browser reuses them across requests and workers,
            // eliminating repeated downloads of large WASM files on first page load.
            const isHtml = url.pathname.endsWith('.html')
            const cacheControl = isHtml
                ? 'no-cache'
                : 'public, max-age=31536000, immutable'
            return new Response(file, {
                headers: { 'Cache-Control': cacheControl },
            })
        }
        // Fall back to index.html for SPA client-side routing
        return new Response(Bun.file(indexHtml), {
            headers: { 'Cache-Control': 'no-cache' },
        })
    },
})
console.log(`Client app running on http://localhost:${clientPort}`)
console.log(`Static files: ${staticDir}`)
