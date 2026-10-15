import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { clientIp, normalizeIp } from './clientIp'

describe('normalizeIp', () => {
    it.each([
        ['192.168.1.5', '192.168.1.5'],
        [' 10.0.0.1 ', '10.0.0.1'],
        ['::ffff:192.168.1.5', '192.168.1.5'],
        ['::FFFF:10.1.2.3', '10.1.2.3'],
        ['::1', '127.0.0.1'],
        ['2001:db8::1', '0.0.0.0'],
        ['999.1.1.1', '0.0.0.0'],
        ['garbage', '0.0.0.0'],
        ['', '0.0.0.0'],
        [undefined, '0.0.0.0'],
    ])('%p -> %p', (raw, expected) => {
        expect(normalizeIp(raw)).toBe(expected)
    })
})

describe('clientIp', () => {
    const app = (trustProxy: boolean) => new Hono().get('/', (c) => c.text(clientIp(c, trustProxy)))
    const server = { requestIP: () => ({ address: '::ffff:172.17.0.1' }) }
    const req = () => new Request('http://x/', { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } })

    it('uses the socket peer address by default, ignoring X-Forwarded-For', async () => {
        expect(await (await app(false).fetch(req(), server)).text()).toBe('172.17.0.1')
    })

    it('uses the first X-Forwarded-For hop when trusting a proxy', async () => {
        expect(await (await app(true).fetch(req(), server)).text()).toBe('203.0.113.7')
    })

    it('falls back to 0.0.0.0 without a server', async () => {
        expect(await (await app(false).fetch(new Request('http://x/'))).text()).toBe('0.0.0.0')
    })
})
