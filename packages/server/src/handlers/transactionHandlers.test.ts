import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { closeCurrentFile, createNewFile } from '../persistence/db'
import type { HandlerSession } from '../session/currentSession'
import {
    handleCreateTransaction,
    handleDeleteTransaction,
    handleFindAccountBalancesAsOf,
    handleFindAccountBalancesForPeriod,
    handleFindLatestTransactionForVendorAndAccount,
    handleFindTransactionsByAccount,
    handleFindTransactionsForPeriod,
    handlePatchTransaction,
} from './transactionHandlers'
import { genAcctId } from '@checquery/shared/domain/accounts/AcctId'
import { genVndrId } from '@checquery/shared/domain/vendors/VndrId'

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

let session: HandlerSession

beforeEach(async () => {
    const result = await createNewFile(tmpDir, freshName(), undefined, 'disabled', { name: 'tester', ipAddress: '10.0.0.1' })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    session = { store: result.store, origId: result.origId }
})

describe('transaction RPC handlers, end to end against a real (temp) file', () => {
    it('createTransaction + findTransactionsByAccount round-trip, with entries and origin stamped correctly', async () => {
        const acctA = genAcctId()
        const acctB = genAcctId()
        const vndrId = genVndrId()

        await handleCreateTransaction(session, {
            postDate: '2026-01-15',
            vndrId,
            description: 'Groceries',
            entries: [
                { acctId: acctA, debit: '$40.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$40.00' },
            ],
        })

        const found = await handleFindTransactionsByAccount(session, { accountId: acctA })
        expect(found).toHaveLength(1)
        expect(found[0]!.postDate as string).toBe('2026-01-15')
        expect(found[0]!.vndrId).toBe(vndrId)
        expect(found[0]!.entries).toHaveLength(2)
        expect(found[0]!.origId).toBeTruthy()

        // Not present against an unrelated account.
        expect(await handleFindTransactionsByAccount(session, { accountId: genAcctId() })).toHaveLength(0)
    })

    it('createTransaction defaults code/description/needsReview when omitted', async () => {
        const acctA = genAcctId()
        const acctB = genAcctId()

        await handleCreateTransaction(session, {
            postDate: '2026-01-16',
            description: 'Only a description',
            entries: [
                { acctId: acctA, debit: '$5.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$5.00' },
            ],
        })

        const [found] = await handleFindTransactionsByAccount(session, { accountId: acctA })
        expect(found!.code).toBe('')
        expect(found!.needsReview).toBe(false)
    })

    it('patchTransaction updates only the given fields, fully replacing entries when entries is present', async () => {
        const acctA = genAcctId()
        const acctB = genAcctId()
        const acctC = genAcctId()

        await handleCreateTransaction(session, {
            postDate: '2026-01-15',
            description: 'Original',
            entries: [
                { acctId: acctA, debit: '$40.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$40.00' },
            ],
        })
        const [created] = await handleFindTransactionsByAccount(session, { accountId: acctA })

        await handlePatchTransaction(session, {
            id: created!.id,
            description: 'Renamed',
            entries: [
                { acctId: acctA, debit: '$75.00', credit: '$0.00' },
                { acctId: acctC, debit: '$0.00', credit: '$75.00' },
            ],
        })

        const [patched] = await handleFindTransactionsByAccount(session, { accountId: acctA })
        expect(patched!.description as string).toBe('Renamed')
        expect(patched!.entries.map((e) => e.acctId)).toEqual([acctA, acctC])
        expect(patched!.entries[0]!.debit as string).toBe('$75.00')
    })

    it('deleteTransaction soft-deletes -- it no longer appears in findTransactionsByAccount', async () => {
        const acctA = genAcctId()
        const acctB = genAcctId()

        await handleCreateTransaction(session, {
            postDate: '2026-01-15',
            description: 'Temp',
            entries: [
                { acctId: acctA, debit: '$10.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$10.00' },
            ],
        })
        const [created] = await handleFindTransactionsByAccount(session, { accountId: acctA })

        await handleDeleteTransaction(session, { id: created!.id })

        expect(await handleFindTransactionsByAccount(session, { accountId: acctA })).toHaveLength(0)
    })

    it('findLatestTransactionForVendorAndAccount picks the most recent match', async () => {
        const acctA = genAcctId()
        const acctB = genAcctId()
        const vndrId = genVndrId()

        await handleCreateTransaction(session, {
            postDate: '2026-01-05',
            vndrId,
            description: 'Older',
            entries: [
                { acctId: acctA, debit: '$10.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$10.00' },
            ],
        })
        await handleCreateTransaction(session, {
            postDate: '2026-01-20',
            vndrId,
            description: 'Newer',
            entries: [
                { acctId: acctA, debit: '$15.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$15.00' },
            ],
        })

        const found = await handleFindLatestTransactionForVendorAndAccount(session, { vndrId, accountId: acctA })
        expect(found?.description as string).toBe('Newer')
    })

    it('findLatestTransactionForVendorAndAccount returns null when there is no match', async () => {
        const found = await handleFindLatestTransactionForVendorAndAccount(session, {
            vndrId: genVndrId(),
            accountId: genAcctId(),
        })
        expect(found).toBeNull()
    })

    it('findAccountBalancesAsOf reflects created transactions', async () => {
        const acctA = genAcctId()
        const acctB = genAcctId()

        await handleCreateTransaction(session, {
            postDate: '2026-01-15',
            description: 'Opening balance',
            entries: [
                { acctId: acctA, debit: '$100.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$100.00' },
            ],
        })

        const balances = await handleFindAccountBalancesAsOf(session, { asOfDate: '2026-01-31' })
        const acctABalance = balances.find((b) => b.acctId === acctA)
        expect(acctABalance!.debit as string).toBe('$100.00')
        expect(acctABalance!.credit as string).toBe('$0.00')
    })

    it('findAccountBalancesForPeriod reflects only transactions within range', async () => {
        const acctA = genAcctId()
        const acctB = genAcctId()

        await handleCreateTransaction(session, {
            postDate: '2026-01-15',
            description: 'Within range',
            entries: [
                { acctId: acctA, debit: '$100.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$100.00' },
            ],
        })
        await handleCreateTransaction(session, {
            postDate: '2026-03-01',
            description: 'Outside range',
            entries: [
                { acctId: acctA, debit: '$999.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$999.00' },
            ],
        })

        const balances = await handleFindAccountBalancesForPeriod(session, { startDate: '2026-01-01', endDate: '2026-01-31' })
        const acctABalance = balances.find((b) => b.acctId === acctA)
        expect(acctABalance!.debit as string).toBe('$100.00')
    })

    it('findTransactionsForPeriod reflects only transactions within range', async () => {
        const acctA = genAcctId()
        const acctB = genAcctId()

        await handleCreateTransaction(session, {
            postDate: '2026-01-15',
            description: 'Within range',
            entries: [
                { acctId: acctA, debit: '$100.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$100.00' },
            ],
        })
        await handleCreateTransaction(session, {
            postDate: '2026-03-01',
            description: 'Outside range',
            entries: [
                { acctId: acctA, debit: '$999.00', credit: '$0.00' },
                { acctId: acctB, debit: '$0.00', credit: '$999.00' },
            ],
        })

        const found = await handleFindTransactionsForPeriod(session, { startDate: '2026-01-01', endDate: '2026-01-31' })
        expect(found.map((t) => t.description as string)).toEqual(['Within range'])
    })
})
