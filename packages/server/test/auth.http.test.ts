import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { alice, bob, startTestServer, type TestServer } from './support'

let server: TestServer
beforeEach(async () => { server = await startTestServer() })
afterEach(() => server.close())

/** Every route that needs a login (L) or a login plus an unlocked file (U) -- table-driven, so adding a route
 * without auth would have to be a deliberate edit here. */
const protectedRoutes: [string, string][] = [
    ['POST', '/api/auth/logout'],
    ['GET', '/api/config'],
    ['GET', '/api/files'],
    ['POST', '/api/files'],
    ['GET', '/api/file'],
    ['POST', '/api/file/new'],
    ['POST', '/api/file/open'],
    ['POST', '/api/file/unlock'],
    ['GET', '/api/file/info'],
    ['POST', '/api/file/close'],
    ['GET', '/api/accounts'],
    ['POST', '/api/accounts'],
    ['PATCH', '/api/accounts/x'],
    ['DELETE', '/api/accounts/x'],
    ['GET', '/api/accounts/x/in-use'],
    ['GET', '/api/accounts/x/transactions'],
    ['GET', '/api/accounts/x/balance-assertions'],
    ['GET', '/api/account-categories'],
    ['POST', '/api/account-categories'],
    ['PATCH', '/api/account-categories/x'],
    ['DELETE', '/api/account-categories/x'],
    ['GET', '/api/account-categories/x/in-use'],
    ['GET', '/api/vendors'],
    ['POST', '/api/vendors'],
    ['PATCH', '/api/vendors/x'],
    ['DELETE', '/api/vendors/x'],
    ['GET', '/api/vendors/x/in-use'],
    ['GET', '/api/transactions?startDate=2026-01-01&endDate=2026-01-31'],
    ['GET', '/api/transactions/latest?vndrId=v&accountId=a'],
    ['POST', '/api/transactions'],
    ['PATCH', '/api/transactions/x'],
    ['DELETE', '/api/transactions/x'],
    ['GET', '/api/balances/as-of?date=2026-01-31'],
    ['GET', '/api/balances/period?startDate=2026-01-01&endDate=2026-01-31'],
    ['POST', '/api/balance-assertions'],
    ['PATCH', '/api/balance-assertions/x'],
    ['DELETE', '/api/balance-assertions/x'],
]

describe('authentication', () => {
    it.each(protectedRoutes)('%s %s is 401 without a login', async (method, path) => {
        const res = await server.browser().json(method, path, method === 'GET' || method === 'DELETE' ? undefined : {})
        expect(res.status).toBe(401)
        expect(res.body.code).toBe('unauthenticated')
    })

    it('health and me are public', async () => {
        const browser = server.browser()
        expect((await browser.json('GET', '/api/health')).body).toEqual({ ok: true })
        expect((await browser.json('GET', '/api/auth/me')).body).toBeNull()
    })

    it('logs in, reports the user, and logs out', async () => {
        const browser = server.browser()
        const login = await browser.json('POST', '/api/auth/login', alice)
        expect(login).toEqual({ status: 200, body: { username: 'alice' } })
        expect(browser.cookie).toStartWith('checquery_session=')

        expect((await browser.json('GET', '/api/auth/me')).body).toEqual({ username: 'alice' })
        expect((await browser.json('GET', '/api/files')).status).toBe(200)

        expect((await browser.json('POST', '/api/auth/logout')).status).toBe(204)
        expect(browser.cookie).toBeNull()
        expect((await browser.json('GET', '/api/files')).status).toBe(401)
    })

    it('sets an HttpOnly, SameSite=Strict cookie', async () => {
        const res = await server.browser().request('POST', '/api/auth/login', alice)
        const cookie = res.headers.get('set-cookie')!
        expect(cookie).toContain('HttpOnly')
        expect(cookie).toContain('SameSite=Strict')
        expect(cookie).toContain('Path=/')
    })

    it('omits Secure on a plain-HTTP login', async () => {
        const res = await server.browser().request('POST', '/api/auth/login', alice)
        expect(res.headers.get('set-cookie')).not.toContain('Secure')
    })

    it('sets and clears a Secure cookie when the trusted proxy says HTTPS', async () => {
        const browser = server.browser()
        const login = await browser.request('POST', '/api/auth/login', alice, { 'x-forwarded-proto': 'https' })
        expect(login.headers.get('set-cookie')).toContain('Secure')
        const logout = await browser.request('POST', '/api/auth/logout', undefined, { 'x-forwarded-proto': 'https' })
        expect(logout.status).toBe(204)
        expect(logout.headers.get('set-cookie')).toContain('Secure')
    })

    it('ignores X-Forwarded-Proto when not trusting a proxy', async () => {
        const untrusting = await startTestServer({ env: { CHECQUERY_TRUST_PROXY: 'false' } })
        try {
            const res = await untrusting.browser().request('POST', '/api/auth/login', alice, { 'x-forwarded-proto': 'https' })
            expect(res.status).toBe(200)
            expect(res.headers.get('set-cookie')).not.toContain('Secure')
        } finally {
            untrusting.close()
        }
    })

    it('rejects a wrong password and an unknown user identically', async () => {
        const wrong = await server.browser().json('POST', '/api/auth/login', { username: 'alice', password: 'nope' })
        const unknown = await server.browser().json('POST', '/api/auth/login', { username: 'mallory', password: 'x' })
        expect(wrong).toEqual({ status: 401, body: { error: 'Incorrect username or password.', code: 'bad-credentials' } })
        expect(unknown).toEqual(wrong)
    })

    it('lets both configured users sign in independently', async () => {
        const a = await server.browser().login(alice)
        const b = await server.browser('192.168.1.11').login(bob)
        expect((await a.json('GET', '/api/auth/me')).body).toEqual({ username: 'alice' })
        expect((await b.json('GET', '/api/auth/me')).body).toEqual({ username: 'bob' })
    })

    it('expires a login session after the idle timeout', async () => {
        const browser = await server.browser().login()
        server.advanceMinutes(server.config.loginIdleMinutes - 1)
        expect((await browser.json('GET', '/api/files')).status).toBe(200)
        server.advanceMinutes(server.config.loginIdleMinutes + 1)
        expect((await browser.json('GET', '/api/files')).status).toBe(401)
    })

    it('rate-limits repeated failed logins per client address', async () => {
        const browser = server.browser('10.9.9.9')
        for (let i = 0; i < 5; i++) {
            expect((await browser.json('POST', '/api/auth/login', { username: 'alice', password: 'bad' })).status).toBe(401)
        }
        const blocked = await browser.request('POST', '/api/auth/login', alice)
        expect(blocked.status).toBe(429)
        expect(blocked.headers.get('retry-after')).toBeTruthy()

        // Another address is unaffected, and the block lifts after the window.
        expect((await server.browser('10.9.9.8').json('POST', '/api/auth/login', alice)).status).toBe(200)
        server.advanceMinutes(2)
        expect((await browser.json('POST', '/api/auth/login', alice)).status).toBe(200)
    })

    it('blocks a cross-site form post (CSRF)', async () => {
        const browser = await server.browser().login()
        const res = await browser.request('POST', '/api/file/close', undefined, {
            'sec-fetch-site': 'cross-site',
            origin: 'https://evil.example',
            'content-type': 'application/x-www-form-urlencoded',
        })
        expect(res.status).toBe(403)
    })

    describe('CSRF Origin fallback (no Sec-Fetch-Site) behind the proxy', () => {
        const formPost = async (cookie: string, origin: string) =>
            server.app.request('http://mnserver.internal:8443/api/file/close', {
                method: 'POST',
                headers: {
                    cookie,
                    origin,
                    'content-type': 'application/x-www-form-urlencoded',
                    'x-forwarded-for': '192.168.1.10',
                    'x-forwarded-proto': 'https',
                    'x-forwarded-host': 'mnserver.internal:8443',
                },
            })

        it('accepts the forwarded https origin', async () => {
            const browser = await server.browser().login()
            const res = await formPost(browser.cookie!, 'https://mnserver.internal:8443')
            expect(res.status).not.toBe(403)
        })

        it('still rejects a mismatched origin', async () => {
            const browser = await server.browser().login()
            expect((await formPost(browser.cookie!, 'https://evil.example')).status).toBe(403)
            expect((await formPost(browser.cookie!, 'http://mnserver.internal:8443')).status).toBe(403)
        })
    })
})
