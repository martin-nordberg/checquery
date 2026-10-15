import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { closeCurrentFile, createNewFile } from '../persistence/db'
import type { HandlerSession } from '../session/currentSession'
import {
    handleCreateAccount,
    handleDeleteAccount,
    handleFindAccountsAll,
    handleIsAccountInUse,
    handlePatchAccount,
} from './accountHandlers'
import { genAcctCtgId } from '@checquery/shared/domain/accountCategories/AcctCtgId'

const tmpDir = mkdtempSync(join(tmpdir(), 'checquery-account-handlers-test-'))
let counter = 0
function freshName() {
    counter += 1
    return `test-file-${counter}`
}

afterAll(() => {
    closeCurrentFile()
    rmSync(tmpDir, { recursive: true, force: true })
})

let session: HandlerSession

beforeEach(async () => {
    const result = await createNewFile(tmpDir, freshName(), undefined, 'disabled', { name: 'tester', ipAddress: '10.0.0.1' })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    session = { store: result.store, origId: result.origId }
})

describe('account handlers, end to end against a real (temp) file', () => {
    it('createAccount + findAccountsAll round-trip, with type/origin/parent stamped correctly', async () => {
        const parentCtgId = genAcctCtgId()
        await handleCreateAccount(session, {
            acctType: 'ASSET',
            parentCtgId,
            name: 'Checking',
            description: 'Primary checking',
            isPrimary: true,
        })

        // createNewFile already seeded the predefined Net Worth account, so this is 2, not 1.
        const accounts = await handleFindAccountsAll(session)
        const checking = accounts.find((a) => a.name as string === 'Checking')
        expect(accounts).toHaveLength(2)
        expect(checking).toBeDefined()
        expect(checking!.acctType).toBe('ASSET')
        expect(checking!.parentCtgId).toBe(parentCtgId)
        expect(checking!.isPrimary).toBe(true)
        expect(checking!.origId).toBeTruthy()
    })

    it('patchAccount updates only the given fields, without an acctType param even being expressible', async () => {
        await handleCreateAccount(session, { acctType: 'ASSET', parentCtgId: genAcctCtgId(), name: 'Original' })
        const created = (await handleFindAccountsAll(session)).find((a) => a.name as string === 'Original')!

        await handlePatchAccount(session, { id: created.id, name: 'Renamed' })

        const patched = (await handleFindAccountsAll(session)).find((a) => a.id === created.id)
        expect(patched!.name as string).toBe('Renamed')
        expect(patched!.acctType).toBe('ASSET')
    })

    it('deleteAccount soft-deletes -- it no longer appears in findAccountsAll', async () => {
        await handleCreateAccount(session, { acctType: 'ASSET', parentCtgId: genAcctCtgId(), name: 'Temp' })
        const created = (await handleFindAccountsAll(session)).find((a) => a.name as string === 'Temp')!

        await handleDeleteAccount(session, { id: created.id })

        // Net Worth is still there -- only the account this test created and then deleted is gone.
        const remaining = await handleFindAccountsAll(session)
        expect(remaining.find((a) => a.id === created.id)).toBeUndefined()
    })

    it('isAccountInUse is false for an unreferenced account', async () => {
        await handleCreateAccount(session, { acctType: 'ASSET', parentCtgId: genAcctCtgId(), name: 'Unused' })
        const created = (await handleFindAccountsAll(session)).find((a) => a.name as string === 'Unused')!

        expect(await handleIsAccountInUse(session, { id: created.id })).toBe(false)
    })
})
