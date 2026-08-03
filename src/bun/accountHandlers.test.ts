import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { closeCurrentFile, createNewFile } from './persistence/db'
import {
    handleCreateAccount,
    handleDeleteAccount,
    handleFindAccountsAll,
    handleIsAccountInUse,
    handlePatchAccount,
} from './accountHandlers'
import { acctIdAssets } from '../shared/domain/accounts/AcctRoot'

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

beforeEach(async () => {
    const result = await createNewFile(tmpDir, freshName(), undefined, 'disabled')
    expect(result.ok).toBe(true)
})

describe('account RPC handlers, end to end against a real (temp) file', () => {
    it('createAccount + findAccountsAll round-trip, with type/origin/parent stamped correctly', async () => {
        await handleCreateAccount({
            acctType: 'ASSET',
            parentId: acctIdAssets,
            name: 'Checking',
            description: 'Primary checking',
            isPrimary: true,
        })

        const accounts = await handleFindAccountsAll()
        expect(accounts).toHaveLength(1)
        expect(accounts[0]!.name as string).toBe('Checking')
        expect(accounts[0]!.acctType).toBe('ASSET')
        expect(accounts[0]!.parentId).toBe(acctIdAssets)
        expect(accounts[0]!.isPrimary).toBe(true)
        expect(accounts[0]!.origId).toBeTruthy()
    })

    it('patchAccount updates only the given fields, without an acctType param even being expressible', async () => {
        await handleCreateAccount({ acctType: 'ASSET', parentId: acctIdAssets, name: 'Original' })
        const [created] = await handleFindAccountsAll()

        await handlePatchAccount({ id: created!.id, name: 'Renamed' })

        const [patched] = await handleFindAccountsAll()
        expect(patched!.name as string).toBe('Renamed')
        expect(patched!.acctType).toBe('ASSET')
    })

    it('deleteAccount soft-deletes -- it no longer appears in findAccountsAll', async () => {
        await handleCreateAccount({ acctType: 'ASSET', parentId: acctIdAssets, name: 'Temp' })
        const [created] = await handleFindAccountsAll()

        await handleDeleteAccount({ id: created!.id })

        expect(await handleFindAccountsAll()).toHaveLength(0)
    })

    it('isAccountInUse is false for an unreferenced account', async () => {
        await handleCreateAccount({ acctType: 'ASSET', parentId: acctIdAssets, name: 'Unused' })
        const [created] = await handleFindAccountsAll()

        expect(await handleIsAccountInUse({ id: created!.id })).toBe(false)
    })

    it('rejects every request when no file is open', async () => {
        closeCurrentFile()

        await expect(handleFindAccountsAll()).rejects.toThrow('No file open')
        await expect(
            handleCreateAccount({ acctType: 'ASSET', parentId: acctIdAssets, name: 'X' }),
        ).rejects.toThrow('No file open')
    })
})
