import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../src/app'
import { loadConfig } from '../src/config'
import { closeCurrentFile } from '../src/persistence/db'

export const alice = { username: 'alice', password: 'alice-password' }
export const bob = { username: 'bob', password: 'bob-password' }

// bcrypt at the minimum cost keeps the suite fast; production hashes are argon2id (both verify the same way).
const hashes = Promise.all([
    Bun.password.hash(alice.password, { algorithm: 'bcrypt', cost: 4 }),
    Bun.password.hash(bob.password, { algorithm: 'bcrypt', cost: 4 }),
])

export type TestServer = Awaited<ReturnType<typeof startTestServer>>

/**
 * A fresh app over a temp data dir (and a stub built client), two configured users, and a controllable clock.
 * `close()` closes whatever file is open (db.ts state is per-process) and removes the temp dirs.
 */
export async function startTestServer(opts?: { encrypted?: boolean; env?: Record<string, string> }) {
    const root = mkdtempSync(join(tmpdir(), 'checquery-http-test-'))
    const dataDir = join(root, 'data')
    const staticDir = join(root, 'public')
    mkdirSync(dataDir)
    mkdirSync(join(staticDir, 'assets'), { recursive: true })
    writeFileSync(join(staticDir, 'index.html'), '<!doctype html><title>Checquery</title>')
    writeFileSync(join(staticDir, 'assets', 'app-abc123.js'), 'console.log(1)')
    writeFileSync(join(staticDir, 'checquery.svg'), '<svg/>')

    const [aliceHash, bobHash] = await hashes
    const config = loadConfig({
        CHECQUERY_DATA_DIR: dataDir,
        CHECQUERY_STATIC_DIR: staticDir,
        CHECQUERY_ENCRYPTION_DISABLED: opts?.encrypted ? 'false' : 'true',
        CHECQUERY_USER1_NAME: alice.username,
        CHECQUERY_USER1_PASSWORD_HASH: aliceHash,
        CHECQUERY_USER2_NAME: bob.username,
        CHECQUERY_USER2_PASSWORD_HASH: bobHash,
        CHECQUERY_TRUST_PROXY: 'true',
        ...opts?.env,
    })
    let nowMs = Date.UTC(2026, 9, 15, 12, 0, 0)
    const { app, state } = createApp(config, { now: () => nowMs })

    return {
        app,
        state,
        config,
        dataDir,
        advanceMinutes(minutes: number) {
            nowMs += minutes * 60_000
        },
        browser(ip = '192.168.1.10') {
            return new TestBrowser(app, ip)
        },
        close() {
            closeCurrentFile()
            rmSync(root, { recursive: true, force: true })
        },
    }
}

type AppLike = { request: (path: string, init?: RequestInit) => Response | Promise<Response> }

/** Drives the app the way a same-origin browser tab would: keeps the session cookie, and sends
 * `Sec-Fetch-Site: same-origin` (which Hono's csrf() checks for body-less/form POSTs). */
export class TestBrowser {
    cookie: string | null = null

    constructor(private readonly app: AppLike, private readonly ip: string) {}

    async request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Response> {
        const h: Record<string, string> = { 'sec-fetch-site': 'same-origin', 'x-forwarded-for': this.ip, ...headers }
        if (this.cookie) h.cookie = this.cookie
        let payload: BodyInit | undefined
        if (body instanceof FormData) payload = body
        else if (body !== undefined) {
            payload = JSON.stringify(body)
            h['content-type'] = 'application/json'
        }
        const res = await this.app.request(`http://localhost${path}`, { method, headers: h, body: payload })
        const setCookie = res.headers.get('set-cookie')
        if (setCookie) {
            const [pair] = setCookie.split(';')
            this.cookie = pair!.endsWith('=') ? null : pair!
        }
        return res
    }

    async json<T = any>(method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
        const res = await this.request(method, path, body)
        const text = await res.text()
        return { status: res.status, body: (text ? JSON.parse(text) : undefined) as T }
    }

    async login(user = alice) {
        const res = await this.json('POST', '/api/auth/login', user)
        if (res.status !== 200) throw new Error(`login failed: ${JSON.stringify(res.body)}`)
        return this
    }
}
