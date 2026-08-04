import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { closeCurrentFile, createNewFile } from './persistence/db'
import {
    handleCreateTransaction,
    handleDeleteTransaction,
    handleFindLatestTransactionForVendorAndAccount,
    handleFindTransactionsByAccount,
    handlePatchTransaction,
} from './transactionHandlers'
import { genAcctId } from '../shared/domain/accounts/AcctId'
import { genVndrId } from '../shared/domain/vendors/VndrId'

const tmpDir = mkdtempSync(join(tmpdir(), 'checquery-transaction-handlers-test-'))
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

describe('transaction RPC handlers, end to end against a real (temp) file', () => {
    it('createTransaction + findTransactionsByAccount round-trip, with entries and origin stamped correctly', async () => {
        const acctA = genAcctId()
        const acctB = genAcctId()
        const vndrId = genVndrId()

        await handleCreateTransaction({
            postDate: '2026-01-15',
            vndrId,
            description: 'Groceries',
            entries: [
                { acctId: acctA, debit: '$40.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$40.00' },
            ],
        })

        const found = await handleFindTransactionsByAccount({ accountId: acctA })
        expect(found).toHaveLength(1)
        expect(found[0]!.postDate as string).toBe('2026-01-15')
        expect(found[0]!.vndrId).toBe(vndrId)
        expect(found[0]!.entries).toHaveLength(2)
        expect(found[0]!.origId).toBeTruthy()

        // Not present against an unrelated account.
        expect(await handleFindTransactionsByAccount({ accountId: genAcctId() })).toHaveLength(0)
    })

    it('createTransaction defaults code/description/needsReview when omitted', async () => {
        const acctA = genAcctId()
        const acctB = genAcctId()

        await handleCreateTransaction({
            postDate: '2026-01-16',
            description: 'Only a description',
            entries: [
                { acctId: acctA, debit: '$5.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$5.00' },
            ],
        })

        const [found] = await handleFindTransactionsByAccount({ accountId: acctA })
        expect(found!.code).toBe('')
        expect(found!.needsReview).toBe(false)
    })

    it('patchTransaction updates only the given fields, fully replacing entries when entries is present', async () => {
        const acctA = genAcctId()
        const acctB = genAcctId()
        const acctC = genAcctId()

        await handleCreateTransaction({
            postDate: '2026-01-15',
            description: 'Original',
            entries: [
                { acctId: acctA, debit: '$40.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$40.00' },
            ],
        })
        const [created] = await handleFindTransactionsByAccount({ accountId: acctA })

        await handlePatchTransaction({
            id: created!.id,
            description: 'Renamed',
            entries: [
                { acctId: acctA, debit: '$75.00', credit: '$0.00' },
                { acctId: acctC, debit: '$0.00', credit: '$75.00' },
            ],
        })

        const [patched] = await handleFindTransactionsByAccount({ accountId: acctA })
        expect(patched!.description as string).toBe('Renamed')
        expect(patched!.entries.map((e) => e.acctId)).toEqual([acctA, acctC])
        expect(patched!.entries[0]!.debit as string).toBe('$75.00')
    })

    it('deleteTransaction soft-deletes -- it no longer appears in findTransactionsByAccount', async () => {
        const acctA = genAcctId()
        const acctB = genAcctId()

        await handleCreateTransaction({
            postDate: '2026-01-15',
            description: 'Temp',
            entries: [
                { acctId: acctA, debit: '$10.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$10.00' },
            ],
        })
        const [created] = await handleFindTransactionsByAccount({ accountId: acctA })

        await handleDeleteTransaction({ id: created!.id })

        expect(await handleFindTransactionsByAccount({ accountId: acctA })).toHaveLength(0)
    })

    it('findLatestTransactionForVendorAndAccount picks the most recent match', async () => {
        const acctA = genAcctId()
        const acctB = genAcctId()
        const vndrId = genVndrId()

        await handleCreateTransaction({
            postDate: '2026-01-05',
            vndrId,
            description: 'Older',
            entries: [
                { acctId: acctA, debit: '$10.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$10.00' },
            ],
        })
        await handleCreateTransaction({
            postDate: '2026-01-20',
            vndrId,
            description: 'Newer',
            entries: [
                { acctId: acctA, debit: '$15.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$15.00' },
            ],
        })

        const found = await handleFindLatestTransactionForVendorAndAccount({ vndrId, accountId: acctA })
        expect(found?.description as string).toBe('Newer')
    })

    it('findLatestTransactionForVendorAndAccount returns null when there is no match', async () => {
        const found = await handleFindLatestTransactionForVendorAndAccount({
            vndrId: genVndrId(),
            accountId: genAcctId(),
        })
        expect(found).toBeNull()
    })

    it('rejects every request when no file is open', async () => {
        closeCurrentFile()

        const acctA = genAcctId()
        const acctB = genAcctId()
        await expect(handleFindTransactionsByAccount({ accountId: acctA })).rejects.toThrow('No file open')
        await expect(
            handleCreateTransaction({
                postDate: '2026-01-15',
                description: 'X',
                entries: [
                    { acctId: acctA, debit: '$1.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$1.00' },
                ],
            }),
        ).rejects.toThrow('No file open')
    })
})
