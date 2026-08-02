import { Database } from 'bun:sqlite'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'bun:test'
import { closeCurrentFile, createNewFile, getCurrentActionLog, getCurrentFile, openExistingFile } from './db'
import { setMetaValue } from './actionLog/meta'
import { genOrigId } from '../../shared/domain/origins/OrigId'

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
    it('creates a file on disk and returns a working actionLog', async () => {
        const name = freshName()
        const result = createNewFile(tmpDir, name, 'hunter2')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        expect(existsSync(result.path)).toBe(true)
        expect(result.fileId).toBeTruthy()

        const appended = await result.actionLog.appendAction('create-origin', { id: genOrigId(), name: 'Jane' } as any)
        expect(appended.hlc).toBeDefined()
    })

    it('fails with already-exists when the path is already taken', () => {
        const name = freshName()
        const first = createNewFile(tmpDir, name, 'hunter2')
        expect(first.ok).toBe(true)

        const second = createNewFile(tmpDir, name, 'hunter2')
        expect(second.ok).toBe(false)
        if (second.ok) return
        expect(second.code).toBe('already-exists')
    })

    it('updates getCurrentFile/getCurrentActionLog', () => {
        const name = freshName()
        const result = createNewFile(tmpDir, name, 'hunter2')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        expect(getCurrentFile()?.path).toBe(result.path)
        expect(getCurrentActionLog()).toBe(result.actionLog)
    })

    it('creates an unencrypted file when no password is given, storing plaintext rows', async () => {
        const name = freshName()
        const result = createNewFile(tmpDir, name)
        expect(result.ok).toBe(true)
        if (!result.ok) return

        await result.actionLog.appendAction('create-origin', { id: genOrigId(), name: 'Jane' } as any)

        const db = new Database(result.path, { create: false, readonly: true })
        const row = db.query(`SELECT iv, encrypted_payload FROM actions`).get() as {
            iv: string
            encrypted_payload: string
        }
        db.close()
        expect(row.iv).toBe('')
        expect(row.encrypted_payload).toContain('"name":"Jane"')
    })

    it('treats an empty-string password the same as no password', () => {
        const name = freshName()
        const result = createNewFile(tmpDir, name, '')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const reopened = openExistingFile(result.path)
        expect(reopened.ok).toBe(true)
    })
})

describe('openExistingFile', () => {
    it('opens an unencrypted file with no password', () => {
        const name = freshName()
        const created = createNewFile(tmpDir, name)
        expect(created.ok).toBe(true)
        if (!created.ok) return

        const opened = openExistingFile(created.path)
        expect(opened.ok).toBe(true)
        if (!opened.ok) return
        expect(opened.fileId).toBe(created.fileId)
    })

    it('opens an unencrypted file even if a password is supplied (ignored)', () => {
        const name = freshName()
        const created = createNewFile(tmpDir, name)
        expect(created.ok).toBe(true)
        if (!created.ok) return

        const opened = openExistingFile(created.path, 'some password')
        expect(opened.ok).toBe(true)
    })

    it('opens a file created with createNewFile using the correct password', () => {
        const name = freshName()
        const created = createNewFile(tmpDir, name, 'correct horse')
        expect(created.ok).toBe(true)
        if (!created.ok) return

        const opened = openExistingFile(created.path, 'correct horse')
        expect(opened.ok).toBe(true)
        if (!opened.ok) return
        expect(opened.fileId).toBe(created.fileId)
    })

    it('fails with wrong-password for an incorrect password', () => {
        const name = freshName()
        const created = createNewFile(tmpDir, name, 'correct horse')
        expect(created.ok).toBe(true)
        if (!created.ok) return

        const opened = openExistingFile(created.path, 'wrong password')
        expect(opened.ok).toBe(false)
        if (opened.ok) return
        expect(opened.code).toBe('wrong-password')
    })

    it('fails with io-error for a nonexistent path', () => {
        const result = openExistingFile(join(tmpDir, 'does-not-exist.checquery'), 'anything')
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.code).toBe('io-error')
    })

    it('fails with not-a-checquery-file for a plain SQLite file with no meta table', () => {
        const path = join(tmpDir, `${freshName()}.checquery`)
        const plainDb = new Database(path, { create: true })
        plainDb.run('CREATE TABLE unrelated (id INTEGER PRIMARY KEY)')
        plainDb.close()

        const result = openExistingFile(path, 'anything')
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.code).toBe('not-a-checquery-file')
    })

    it('fails with unsupported-version for a schema_version newer than this build knows', () => {
        const name = freshName()
        const created = createNewFile(tmpDir, name, 'correct horse')
        expect(created.ok).toBe(true)
        if (!created.ok) return

        const db = new Database(created.path, { create: false, readwrite: true })
        setMetaValue(db, 'schema_version', '9999')
        db.close()

        const result = openExistingFile(created.path, 'correct horse')
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.code).toBe('unsupported-version')
    })
})
