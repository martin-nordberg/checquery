import { Database } from 'bun:sqlite'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'bun:test'
import { closeCurrentFile, createNewFile, getCurrentFile, getCurrentFileInfo, getCurrentLedgerStore, getCurrentOrigId, openExistingFile } from './db'
import { setMetaValue } from './actionLog/meta'
import { genOrigId } from '../../shared/domain/origins/OrigId'
import { accountCreationEventSchema } from '../../shared/domain/accounts/Account'
import { genAcctId } from '../../shared/domain/accounts/AcctId'
import { acctIdAssets } from '../../shared/domain/accounts/AcctRoot'
import { originCreationEventSchema } from '../../shared/domain/origins/Origin'

const tmpDir = mkdtempSync(join(tmpdir(), 'checquery-db-test-'))
let counter = 0
function freshName() {
    counter += 1
    return `test-file-${counter}`
}

afterAll(() => {
    closeCurrentFile()
    rmSync(tmpDir, { recursive: true, force: true })
})

describe('createNewFile', () => {
    it('creates a file on disk and returns a working store', async () => {
        const name = freshName()
        const result = await createNewFile(tmpDir, name, 'hunter2', 'enabled')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        expect(existsSync(result.path)).toBe(true)
        expect(result.fileId).toBeTruthy()

        const appended = await result.store.actionLog.appendAction('create-origin', { id: genOrigId(), name: 'Jane' } as any)
        expect(appended.hlc).toBeDefined()
    })

    it('fails with already-exists when the path is already taken', async () => {
        const name = freshName()
        const first = await createNewFile(tmpDir, name, 'hunter2', 'enabled')
        expect(first.ok).toBe(true)

        const second = await createNewFile(tmpDir, name, 'hunter2', 'enabled')
        expect(second.ok).toBe(false)
        if (second.ok) return
        expect(second.code).toBe('already-exists')
    })

    it('updates getCurrentFile/getCurrentLedgerStore', async () => {
        const name = freshName()
        const result = await createNewFile(tmpDir, name, 'hunter2', 'enabled')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        expect(getCurrentFile()?.path).toBe(result.path)
        expect(getCurrentLedgerStore()).toBe(result.store)
    })

    it('names the file with a ".checquery" extension when encryption is enabled', async () => {
        const name = freshName()
        const result = await createNewFile(tmpDir, name, 'hunter2', 'enabled')
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.path.endsWith('.checquery')).toBe(true)
    })

    it('bootstraps a current origin for the session', async () => {
        const name = freshName()
        const result = await createNewFile(tmpDir, name, 'hunter2', 'enabled')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const origId = getCurrentOrigId()
        expect(origId).not.toBeNull()

        const origins = await result.store.svcs.origins.findOriginsAll()
        expect(origins).toHaveLength(1)
        expect(origins[0]!.id).toBe(origId!)
    })

    describe('when encryption is enabled, a password is required (documentation/test-mode.md)', () => {
        it('fails with password-required when no password is given', async () => {
            const name = freshName()
            const result = await createNewFile(tmpDir, name, undefined, 'enabled')
            expect(result.ok).toBe(false)
            if (result.ok) return
            expect(result.code).toBe('password-required')
            expect(existsSync(join(tmpDir, `${name}.checquery`))).toBe(false)
        })

        it('fails with password-required for an empty-string password too', async () => {
            const name = freshName()
            const result = await createNewFile(tmpDir, name, '', 'enabled')
            expect(result.ok).toBe(false)
            if (result.ok) return
            expect(result.code).toBe('password-required')
        })
    })

    describe('when encryption is disabled (test mode)', () => {
        it('creates an unencrypted file with a ".checquery-test" extension, storing plaintext rows', async () => {
            const name = freshName()
            const result = await createNewFile(tmpDir, name, undefined, 'disabled')
            expect(result.ok).toBe(true)
            if (!result.ok) return
            expect(result.path.endsWith('.checquery-test')).toBe(true)

            await result.store.actionLog.appendAction('create-origin', { id: genOrigId(), name: 'Jane' } as any)

            // Creating the file already bootstraps a "current origin" action (see bootstrapCurrentOrigin in
            // db.ts), so there's more than one row here -- filter to the one this test actually appended.
            const db = new Database(result.path, { create: false, readonly: true })
            const row = db.query(`SELECT iv, encrypted_payload FROM actions WHERE encrypted_payload LIKE '%Jane%'`).get() as {
                iv: string
                encrypted_payload: string
            }
            db.close()
            expect(row.iv).toBe('')
            expect(row.encrypted_payload).toContain('"name":"Jane"')
        })

        it('ignores a password even if one is passed in', async () => {
            const name = freshName()
            const result = await createNewFile(tmpDir, name, 'some password', 'disabled')
            expect(result.ok).toBe(true)
            if (!result.ok) return

            // Unencrypted regardless -- opens back up with no password needed.
            const reopened = await openExistingFile(result.path)
            expect(reopened.ok).toBe(true)
        })
    })
})

describe('openExistingFile', () => {
    it('opens an unencrypted (test-mode) file with no password', async () => {
        const name = freshName()
        const created = await createNewFile(tmpDir, name, undefined, 'disabled')
        expect(created.ok).toBe(true)
        if (!created.ok) return

        const opened = await openExistingFile(created.path)
        expect(opened.ok).toBe(true)
        if (!opened.ok) return
        expect(opened.fileId).toBe(created.fileId)
    })

    it('reuses the same origin on reopen instead of creating a second one for the same identity', async () => {
        const name = freshName()
        const created = await createNewFile(tmpDir, name, undefined, 'disabled')
        expect(created.ok).toBe(true)
        if (!created.ok) return
        const origIdAfterCreate = getCurrentOrigId()

        const opened = await openExistingFile(created.path)
        expect(opened.ok).toBe(true)
        if (!opened.ok) return

        expect(getCurrentOrigId()).toBe(origIdAfterCreate!)
        const origins = await opened.store.svcs.origins.findOriginsAll()
        expect(origins).toHaveLength(1)
    })

    it('opens an unencrypted file even if a password is supplied (ignored)', async () => {
        const name = freshName()
        const created = await createNewFile(tmpDir, name, undefined, 'disabled')
        expect(created.ok).toBe(true)
        if (!created.ok) return

        const opened = await openExistingFile(created.path, 'some password')
        expect(opened.ok).toBe(true)
    })

    it('opens a file created with createNewFile using the correct password', async () => {
        const name = freshName()
        const created = await createNewFile(tmpDir, name, 'correct horse', 'enabled')
        expect(created.ok).toBe(true)
        if (!created.ok) return

        const opened = await openExistingFile(created.path, 'correct horse')
        expect(opened.ok).toBe(true)
        if (!opened.ok) return
        expect(opened.fileId).toBe(created.fileId)
    })

    it('fails with wrong-password for an incorrect password', async () => {
        const name = freshName()
        const created = await createNewFile(tmpDir, name, 'correct horse', 'enabled')
        expect(created.ok).toBe(true)
        if (!created.ok) return

        const opened = await openExistingFile(created.path, 'wrong password')
        expect(opened.ok).toBe(false)
        if (opened.ok) return
        expect(opened.code).toBe('wrong-password')
    })

    it('fails with io-error for a nonexistent path', async () => {
        const result = await openExistingFile(join(tmpDir, 'does-not-exist.checquery'), 'anything')
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.code).toBe('io-error')
    })

    it('fails with not-a-checquery-file for a plain SQLite file with no meta table', async () => {
        const path = join(tmpDir, `${freshName()}.checquery`)
        const plainDb = new Database(path, { create: true })
        plainDb.run('CREATE TABLE unrelated (id INTEGER PRIMARY KEY)')
        plainDb.close()

        const result = await openExistingFile(path, 'anything')
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.code).toBe('not-a-checquery-file')
    })

    it('fails with unsupported-version for a schema_version newer than this build knows', async () => {
        const name = freshName()
        const created = await createNewFile(tmpDir, name, 'correct horse', 'enabled')
        expect(created.ok).toBe(true)
        if (!created.ok) return

        const db = new Database(created.path, { create: false, readwrite: true })
        setMetaValue(db, 'schema_version', '9999')
        db.close()

        const result = await openExistingFile(created.path, 'correct horse')
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.code).toBe('unsupported-version')
    })
})

describe('getCurrentFileInfo', () => {
    it('is null when no file is open', async () => {
        closeCurrentFile()
        expect(await getCurrentFileInfo()).toBeNull()
    })

    it('reports name, size, entity counts, action log count, and meta for a freshly created file', async () => {
        const name = freshName()
        const created = await createNewFile(tmpDir, name, 'hunter2', 'enabled')
        expect(created.ok).toBe(true)
        if (!created.ok) return

        const info = await getCurrentFileInfo()
        expect(info).not.toBeNull()
        expect(info!.name).toBe(created.name)
        expect(info!.path).toBe(created.path)
        expect(info!.sizeBytes).toBeGreaterThan(0)
        expect(new Date(info!.lastModifiedIso).getTime()).not.toBeNaN()
        // origins:1 and actionLogEntryCount:1, not 0 -- creating a file bootstraps a "current origin" for
        // this session (see bootstrapCurrentOrigin in db.ts), which is itself one action-log entry.
        expect(info!.entityCounts).toEqual({
            origins: 1,
            accounts: 0,
            vendors: 0,
            transactions: 0,
            balanceAssertions: 0,
        })
        expect(info!.actionLogEntryCount).toBe(1)
        expect(info!.meta.find((e) => e.key === 'file_id')?.value).toBe(created.fileId)
        expect(info!.meta.find((e) => e.key === 'encrypted')?.value).toBe('true')
    })

    it('reflects writes made through the ledger store', async () => {
        const name = freshName()
        const created = await createNewFile(tmpDir, name, undefined, 'disabled')
        expect(created.ok).toBe(true)
        if (!created.ok) return

        // createNewFile already bootstrapped one origin for this session; this creates a second, distinct
        // one (different name/ipAddress) to prove writes made directly through the store are reflected too.
        const origin = await created.store.svcs.origins.createOrigin(
            originCreationEventSchema.parse({ id: genOrigId(), name: 'Tester', ipAddress: '10.0.0.99' }),
        )
        await created.store.svcs.accounts.createAccount(accountCreationEventSchema.parse({
            id: genAcctId(),
            origId: origin!.id,
            parentId: acctIdAssets,
            acctType: 'ASSET',
            name: 'Checking',
        }))

        const info = await getCurrentFileInfo()
        expect(info!.entityCounts.accounts).toBe(1)
        expect(info!.entityCounts.origins).toBe(2)
        expect(info!.actionLogEntryCount).toBe(3)
    })
})
