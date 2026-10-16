import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { expectedOrigin, requestIsHttps } from './requestProtocol'

const app = (trustProxy: boolean) =>
    new Hono()
        .get('/https', (c) => c.text(String(requestIsHttps(c, trustProxy))))
        .get('/origin', (c) => c.text(expectedOrigin(c, trustProxy)))

const get = async (trustProxy: boolean, url: string, headers: Record<string, string> = {}) =>
    (await app(trustProxy).request(url, { headers })).text()

const forwarded = { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'mnserver.internal:8443' }

describe('requestIsHttps', () => {
    it('is true for an https: request URL', async () => {
        expect(await get(false, 'https://localhost/https')).toBe('true')
        expect(await get(true, 'https://localhost/https')).toBe('true')
    })

    it('is false for plain http without forwarded headers', async () => {
        expect(await get(true, 'http://localhost/https')).toBe('false')
    })

    it('honors X-Forwarded-Proto only when trusting a proxy', async () => {
        expect(await get(true, 'http://localhost/https', forwarded)).toBe('true')
        expect(await get(false, 'http://localhost/https', forwarded)).toBe('false')
        expect(await get(true, 'http://localhost/https', { 'x-forwarded-proto': 'http' })).toBe('false')
    })

    it('uses the first X-Forwarded-Proto hop', async () => {
        expect(await get(true, 'http://localhost/https', { 'x-forwarded-proto': 'HTTPS, http' })).toBe('true')
    })
})

describe('expectedOrigin', () => {
    it('is the request URL origin without a trusted proxy', async () => {
        expect(await get(false, 'http://mnserver.internal:8443/origin', forwarded)).toBe('http://mnserver.internal:8443')
    })

    it('uses the forwarded protocol and host when trusting a proxy', async () => {
        expect(await get(true, 'http://checquery:3000/origin', forwarded)).toBe('https://mnserver.internal:8443')
    })

    it('keeps the request host when only the protocol is forwarded', async () => {
        expect(await get(true, 'http://mnserver.internal:8443/origin', { 'x-forwarded-proto': 'https' })).toBe('https://mnserver.internal:8443')
    })

    it('drops a default port the way a browser Origin does', async () => {
        expect(await get(true, 'http://checquery:3000/origin', { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'example.test:443' })).toBe('https://example.test')
    })

    it('falls back to the request URL origin when trusted but not forwarded', async () => {
        expect(await get(true, 'http://localhost:3000/origin')).toBe('http://localhost:3000')
    })
})
