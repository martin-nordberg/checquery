import { existsSync, readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { alice, bob, startTestServer, type TestServer } from './support'
import { closeIfIdle } from '../src/idleClose'

let server: TestServer
beforeEach(async () => { server = await startTestServer() })
afterEach(() => server.close())

describe('file lifecycle (test mode)', () => {
    it('lists, creates, reports, closes (with backup), and reopens a file', async () => {
        const browser = await server.browser().login()
        expect((await browser.json('GET', '/api/config')).body).toEqual({
            encryptionMode: 'disabled',
            maxUploadBytes: 200 * 1024 * 1024,
        })
        expect((await browser.json('GET', '/api/files')).body).toEqual([])
        expect((await browser.json('GET', '/api/file')).body).toBeNull()

        const created = await browser.json('POST', '/api/file/new', { name: 'Household' })
        expect(created.status).toBe(200)
        expect(created.body.name).toBe('Household.checquery-test')

        const current = await browser.json('GET', '/api/file')
        expect(current.body).toMatchObject({ name: 'Household.checquery-test', unlocked: true, fileId: created.body.fileId })

        const listed = await browser.json('GET', '/api/files')
        expect(listed.body.map((f: { name: string }) => f.name)).toEqual(['Household.checquery-test'])

        const info = await browser.json('GET', '/api/file/info')
        expect(info.body.entityCounts.accounts).toBe(1)

        expect((await browser.json('POST', '/api/file/close')).body).toEqual({ closed: true })
        expect(readdirSync(join(server.dataDir, 'backups'))).toHaveLength(1)
        expect((await browser.json('GET', '/api/file')).body).toBeNull()
        expect((await browser.json('GET', '/api/accounts')).body.code).toBe('no-file-open')

        const reopened = await browser.json('POST', '/api/file/open', { name: 'Household.checquery-test' })
        expect(reopened.body.fileId).toBe(created.body.fileId)
    })

    it('rejects traversal and malformed names', async () => {
        const browser = await server.browser().login()
        for (const name of ['../escape', 'a/b', '..', '.hidden', '']) {
            const res = await browser.json('POST', '/api/file/new', { name })
            expect(res.status).toBe(400)
        }
        expect(readdirSync(server.dataDir)).toEqual([])
    })

    it('refuses to create over an existing file, and 404s an unknown one', async () => {
        const browser = await server.browser().login()
        await browser.json('POST', '/api/file/new', { name: 'Dup' })
        expect((await browser.json('POST', '/api/file/new', { name: 'Dup' })).body.code).toBe('already-exists')
        expect((await browser.json('POST', '/api/file/open', { name: 'Nope' })).status).toBe(404)
    })

    it('makes a second login session unlock the open file, and attributes its writes to its own origin', async () => {
        const a = await server.browser('192.168.1.10').login(alice)
        await a.json('POST', '/api/file/new', { name: 'Shared' })

        const b = await server.browser('192.168.1.20').login(bob)
        expect((await b.json('GET', '/api/file')).body.unlocked).toBe(false)
        expect((await b.json('GET', '/api/accounts')).body.code).toBe('file-locked')

        expect((await b.json('POST', '/api/file/unlock', {})).status).toBe(200)
        const create = await b.json('POST', '/api/vendors', { name: 'Grocer' })
        expect(create.status).toBe(204)

        const vendors = (await a.json('GET', '/api/vendors')).body
        const accounts = (await a.json('GET', '/api/accounts')).body
        expect(vendors[0].origId).not.toBe(accounts[0].origId)
    })

    it('opening another file backs up the replaced one and locks other sessions out of the new one', async () => {
        const a = await server.browser().login(alice)
        await a.json('POST', '/api/file/new', { name: 'First' })
        const b = await server.browser('192.168.1.20').login(bob)
        await b.json('POST', '/api/file/unlock', {})

        await a.json('POST', '/api/file/new', { name: 'Second' })
        expect(readdirSync(join(server.dataDir, 'backups'))[0]).toStartWith('First-')
        expect((await b.json('GET', '/api/accounts')).body.code).toBe('file-locked')
        expect((await a.json('GET', '/api/accounts')).status).toBe(200)
    })

    it('closes an idle file (with backup) after the configured minutes, but not before', async () => {
        const browser = await server.browser().login()
        await browser.json('POST', '/api/file/new', { name: 'Idle' })

        server.advanceMinutes(59)
        expect(await closeIfIdle(server.state)).toBe(false)
        server.advanceMinutes(2)
        expect(await closeIfIdle(server.state)).toBe(true)
        expect(existsSync(join(server.dataDir, 'backups'))).toBe(true)
        expect((await browser.json('GET', '/api/file')).body).toBeNull()
    })

    it('serializes overlapping mutations', async () => {
        const browser = await server.browser().login()
        await browser.json('POST', '/api/file/new', { name: 'Busy' })
        const results = await Promise.all(
            Array.from({ length: 10 }, (_, i) => browser.json('POST', '/api/vendors', { name: `Vendor ${i}` })),
        )
        expect(results.every((r) => r.status === 204)).toBe(true)
        expect((await browser.json('GET', '/api/vendors')).body).toHaveLength(10)
    })
})

describe('file lifecycle (encrypted)', () => {
    let enc: TestServer
    beforeEach(async () => {
        server.close()
        enc = await startTestServer({ encrypted: true })
        server = enc
    })

    it('requires the password to create, open, and unlock', async () => {
        const a = await enc.browser().login(alice)
        expect((await a.json('POST', '/api/file/new', { name: 'Vault' })).body.code).toBe('password-required')
        expect((await a.json('POST', '/api/file/new', { name: 'Vault', password: 'pw' })).status).toBe(200)
        await a.json('POST', '/api/file/close')

        // A wrong password leaves nothing open.
        const wrong = await a.json('POST', '/api/file/open', { name: 'Vault', password: 'nope' })
        expect(wrong).toEqual({ status: 401, body: { error: 'Incorrect password.', code: 'wrong-password' } })
        expect((await a.json('GET', '/api/file')).body).toBeNull()
        expect((await a.json('POST', '/api/file/open', { name: 'Vault', password: 'pw' })).status).toBe(200)

        const b = await enc.browser('192.168.1.20').login(bob)
        expect((await b.json('POST', '/api/file/unlock', { password: 'nope' })).body.code).toBe('wrong-password')
        expect((await b.json('POST', '/api/file/unlock', { password: 'pw' })).status).toBe(200)
    })

    it('leaves the open file untouched when opening another fails', async () => {
        const a = await enc.browser().login(alice)
        await a.json('POST', '/api/file/new', { name: 'One', password: 'pw' })
        await a.json('POST', '/api/file/new', { name: 'Two', password: 'pw2' })
        await a.json('POST', '/api/file/open', { name: 'One', password: 'bad' })
        expect((await a.json('GET', '/api/file')).body).toMatchObject({ name: 'Two.checquery', unlocked: true })
    })

    it('rate-limits wrong file passwords', async () => {
        const a = await enc.browser().login(alice)
        await a.json('POST', '/api/file/new', { name: 'Vault', password: 'pw' })
        const b = await enc.browser('10.1.1.1').login(bob)
        for (let i = 0; i < 5; i++) await b.json('POST', '/api/file/unlock', { password: 'bad' })
        expect((await b.json('POST', '/api/file/unlock', { password: 'pw' })).status).toBe(429)
    })
})

describe('upload', () => {
    async function makeFile(name: string): Promise<Uint8Array> {
        const browser = await server.browser().login()
        await browser.json('POST', '/api/file/new', { name })
        await browser.json('POST', '/api/file/close')
        return new Uint8Array(await Bun.file(join(server.dataDir, `${name}.checquery-test`)).arrayBuffer())
    }

    function form(bytes: BodyPart, name: string): FormData {
        const fd = new FormData()
        fd.append('file', new File([bytes as BlobPart], name))
        return fd
    }
    type BodyPart = Uint8Array | string

    it('adds a valid file under its own name', async () => {
        const bytes = await makeFile('Original')
        // Remove the original, so the upload isn't a duplicate of a file already on the server.
        unlinkSync(join(server.dataDir, 'Original.checquery-test'))
        const browser = await server.browser().login()
        const res = await browser.json('POST', '/api/files', form(bytes, 'Imported.checquery-test'))
        expect(res.status).toBe(201)
        expect(res.body.name).toBe('Imported.checquery-test')
        expect((await browser.json('POST', '/api/file/open', { name: 'Imported' })).status).toBe(200)
        expect(readdirSync(server.dataDir).filter((n) => n.startsWith('.'))).toEqual([])
    })

    it('rejects a copy of a file already on the server', async () => {
        const bytes = await makeFile('Original')
        const res = await (await server.browser().login()).json('POST', '/api/files', form(bytes, 'Copy.checquery-test'))
        expect(res.status).toBe(409)
        expect(res.body.code).toBe('duplicate-file-id')
    })

    it('rejects an existing name, a wrong extension, and non-checquery content', async () => {
        await makeFile('Taken')
        const browser = await server.browser().login()
        expect((await browser.json('POST', '/api/files', form('x', 'Taken.checquery-test'))).body.code).toBe('already-exists')
        expect((await browser.json('POST', '/api/files', form('x', 'notes.txt'))).body.code).toBe('invalid-name')
        expect((await browser.json('POST', '/api/files', form('x', 'Real.checquery'))).body.code).toBe('invalid-name')
        expect((await browser.json('POST', '/api/files', form('not sqlite', 'Junk.checquery-test'))).body.code).toBe(
            'not-a-checquery-file',
        )
        expect(readdirSync(server.dataDir).filter((n) => n.startsWith('.'))).toEqual([])
    })

    it('rejects an oversized upload', async () => {
        server.close()
        server = await startTestServer({ env: { CHECQUERY_MAX_UPLOAD_MB: '1' } })
        const browser = await server.browser().login()
        const res = await browser.json('POST', '/api/files', form(new Uint8Array(2 * 1024 * 1024), 'Big.checquery-test'))
        expect(res.status).toBe(413)
        expect(res.body.code).toBe('too-large')
    })
})
