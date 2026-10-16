import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { startTestServer, type TestServer } from './support'

let server: TestServer
beforeEach(async () => { server = await startTestServer() })
afterEach(() => server.close())

describe('static client', () => {
    it('serves index.html at / and for client-side routes (SPA fallback), uncached', async () => {
        for (const path of ['/', '/register/acct123', '/incomestatement/2026-01/summary', '/login']) {
            const res = await server.app.request(`http://localhost${path}`)
            expect(res.status).toBe(200)
            expect(await res.text()).toContain('<title>Checquery</title>')
            expect(res.headers.get('cache-control')).toBe('no-cache')
        }
    })

    it('serves hashed assets with immutable caching, and 404s missing ones', async () => {
        const res = await server.app.request('http://localhost/assets/app-abc123.js')
        expect(res.status).toBe(200)
        expect(res.headers.get('cache-control')).toContain('immutable')
        expect((await server.app.request('http://localhost/assets/missing.js')).status).toBe(404)
    })

    it('serves other root files (favicon) and never escapes the static dir', async () => {
        expect(await (await server.app.request('http://localhost/checquery.svg')).text()).toBe('<svg/>')
        const escape = await server.app.request('http://localhost/..%2f..%2fetc%2fpasswd')
        expect(await escape.text()).toContain('<title>Checquery</title>')
    })

    it('sends security headers', async () => {
        const res = await server.app.request('http://localhost/')
        expect(res.headers.get('content-security-policy')).toContain("default-src 'self'")
        expect(res.headers.get('x-content-type-options')).toBe('nosniff')
        // No HSTS: it would force HTTPS onto every other service on the same hostname.
        expect(res.headers.get('strict-transport-security')).toBeNull()
    })
})
