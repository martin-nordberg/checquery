import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'bun:test'
import { ConfigError, loadConfig } from './config'

const dataDir = mkdtempSync(join(tmpdir(), 'checquery-config-test-'))
afterAll(() => rmSync(dataDir, { recursive: true, force: true }))

const hash = '$argon2id$v=19$m=65536,t=2,p=1$c2FsdHNhbHQ$aGFzaGhhc2hoYXNoaGFzaA'
const base = { CHECQUERY_DATA_DIR: dataDir, CHECQUERY_USER1_NAME: 'alice', CHECQUERY_USER1_PASSWORD_HASH: hash }

function fails(env: Record<string, string | undefined>, message: string | RegExp) {
    expect(() => loadConfig(env)).toThrow(ConfigError)
    expect(() => loadConfig(env)).toThrow(message)
}

describe('loadConfig', () => {
    it('applies defaults', () => {
        const config = loadConfig(base)
        expect(config).toMatchObject({
            host: '127.0.0.1',
            port: 3000,
            dataDir,
            encryptionMode: 'enabled',
            users: [{ name: 'alice', passwordHash: hash }],
            loginIdleMinutes: 480,
            idleCloseMinutes: 60,
            trustProxy: false,
            maxUploadBytes: 200 * 1024 * 1024,
        })
        expect(config.staticDir).toEndWith(join('packages', 'client', 'dist'))
    })

    it('reads overrides', () => {
        const config = loadConfig({
            ...base,
            CHECQUERY_HOST: '0.0.0.0',
            CHECQUERY_PORT: '8080',
            CHECQUERY_IDLE_CLOSE_MINUTES: '0',
            CHECQUERY_TRUST_PROXY: 'true',
            CHECQUERY_MAX_UPLOAD_MB: '5',
            CHECQUERY_USER2_NAME: 'bob',
            CHECQUERY_USER2_PASSWORD_HASH: hash,
        })
        expect(config).toMatchObject({ host: '0.0.0.0', port: 8080, idleCloseMinutes: 0, trustProxy: true, maxUploadBytes: 5 * 1024 * 1024 })
        expect(config.users.map((u) => u.name)).toEqual(['alice', 'bob'])
    })

    it('rejects bad numbers and booleans, naming the variable', () => {
        fails({ ...base, CHECQUERY_PORT: 'eighty' }, 'CHECQUERY_PORT')
        fails({ ...base, CHECQUERY_PORT: '70000' }, 'CHECQUERY_PORT')
        fails({ ...base, CHECQUERY_IDLE_CLOSE_MINUTES: '-1' }, 'CHECQUERY_IDLE_CLOSE_MINUTES')
        fails({ ...base, CHECQUERY_TRUST_PROXY: 'yes' }, 'CHECQUERY_TRUST_PROXY')
    })

    it('keeps CHECQUERY_ENCRYPTION_DISABLED fail-fast validation', () => {
        expect(loadConfig({ ...base, CHECQUERY_ENCRYPTION_DISABLED: 'true' }).encryptionMode).toBe('disabled')
        fails({ ...base, CHECQUERY_ENCRYPTION_DISABLED: 'maybe' }, 'CHECQUERY_ENCRYPTION_DISABLED')
    })

    it('refuses test mode in production unless forced', () => {
        const env = { ...base, CHECQUERY_ENCRYPTION_DISABLED: 'true', NODE_ENV: 'production' }
        fails(env, 'refused when NODE_ENV=production')
        expect(loadConfig({ ...env, CHECQUERY_ALLOW_TEST_MODE: 'true' }).encryptionMode).toBe('disabled')
    })

    it('requires user 1, both halves of each user, distinct names, and real-looking hashes', () => {
        fails({ CHECQUERY_DATA_DIR: dataDir }, 'No users configured')
        fails({ ...base, CHECQUERY_USER2_NAME: 'bob' }, 'must be set together')
        fails({ ...base, CHECQUERY_USER2_NAME: 'alice', CHECQUERY_USER2_PASSWORD_HASH: hash }, 'must differ')
        fails({ ...base, CHECQUERY_USER1_PASSWORD_HASH: 'plaintext' }, "doesn't look like a password hash")
        fails({ ...base, CHECQUERY_USER1_PASSWORD_HASH: 'argon2id$v=19' }, "doesn't look like a password hash")
        fails({ ...base, CHECQUERY_USER1_NAME: 'two\nlines' }, 'not a valid name')
    })

    it('requires an existing data directory unless told not to check', () => {
        const env = { ...base, CHECQUERY_DATA_DIR: join(dataDir, 'missing') }
        fails(env, 'must be an existing, writable directory')
        expect(loadConfig(env, { checkDataDir: false }).dataDir).toBe(join(dataDir, 'missing'))
    })
})
