import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'
import { createSchema } from '../schema'
import { TransactionMaterializedStoreSvc } from './TransactionMaterializedStoreSvc'
import {
    transactionCreationEventSchema,
    transactionDeletionEventSchema,
    transactionPatchEventSchema,
} from '../../../../shared/domain/transactions/Transaction'
import { genTxnId } from '../../../../shared/domain/transactions/TxnId'
import { genAcctId } from '../../../../shared/domain/accounts/AcctId'
import { genVndrId } from '../../../../shared/domain/vendors/VndrId'
import { genOrigId } from '../../../../shared/domain/origins/OrigId'
import { isoDateSchema } from '../../../../shared/domain/core/IsoDate'

function makeSvc() {
    const db = new Database(':memory:')
    createSchema(db)
    return { db, svc: new TransactionMaterializedStoreSvc(db) }
}

const acctA = genAcctId()
const acctB = genAcctId()

describe('TransactionMaterializedStoreSvc', () => {
    describe('createTransaction / findTransactionById', () => {
        it('creates a transaction with its entries, retrievable by id in ordinal order', async () => {
            const { svc } = makeSvc()
            const vndrId = genVndrId()
            const event = transactionCreationEventSchema.parse({
                id: genTxnId(),
                origId: genOrigId(),
                postDate: '2026-01-15',
                vndrId,
                description: 'Groceries',
                entries: [
                    { acctId: acctA, debit: '$100.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$100.00' },
                ],
            })

            await svc.createTransaction(event)
            const found = await svc.findTransactionById(event.id)

            expect(found).not.toBeNull()
            expect(found!.postDate as string).toBe('2026-01-15')
            expect(found!.vndrId).toBe(vndrId)
            expect(found!.entries).toHaveLength(2)
            expect(found!.entries[0]!.acctId).toBe(acctA)
            expect(found!.entries[0]!.debit as string).toBe('$100.00')
            expect(found!.entries[0]!.credit as string).toBe('$0.00')
            expect(found!.entries[1]!.acctId).toBe(acctB)
            expect(found!.entries[1]!.credit as string).toBe('$100.00')
        })

        it('preserves entry order across more than two entries', async () => {
            const { svc } = makeSvc()
            const acctC = genAcctId()
            const event = transactionCreationEventSchema.parse({
                id: genTxnId(),
                origId: genOrigId(),
                postDate: '2026-01-15',
                description: 'Split purchase',
                entries: [
                    { acctId: acctA, debit: '$50.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$50.00', credit: '$0.00' },
                    { acctId: acctC, debit: '$0.00', credit: '$100.00' },
                ],
            })

            await svc.createTransaction(event)
            const found = await svc.findTransactionById(event.id)
            expect(found!.entries.map((e) => e.acctId)).toEqual([acctA, acctB, acctC])
        })

        it('findTransactionById returns null for an unknown id', async () => {
            const { svc } = makeSvc()
            expect(await svc.findTransactionById(genTxnId())).toBeNull()
        })
    })

    describe('patchTransaction', () => {
        it('updates only the fields present, leaving entries untouched when entries is absent', async () => {
            const { svc } = makeSvc()
            const created = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-15', description: 'Original',
                entries: [
                    { acctId: acctA, debit: '$100.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$100.00' },
                ],
            })
            await svc.createTransaction(created)

            const patch = transactionPatchEventSchema.parse({
                id: created.id, origId: genOrigId(), description: 'Renamed',
            })
            await svc.patchTransaction(patch)

            const found = await svc.findTransactionById(created.id)
            expect(found!.description as string).toBe('Renamed')
            expect(found!.postDate as string).toBe('2026-01-15')
            expect(found!.entries).toHaveLength(2)
            expect(found!.entries[0]!.acctId).toBe(acctA)
        })

        it('fully replaces entries when entries is present on the patch', async () => {
            const { svc } = makeSvc()
            const created = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-15', description: 'Original',
                entries: [
                    { acctId: acctA, debit: '$100.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$100.00' },
                ],
            })
            await svc.createTransaction(created)

            const acctC = genAcctId()
            const patch = transactionPatchEventSchema.parse({
                id: created.id,
                origId: genOrigId(),
                entries: [
                    { acctId: acctC, debit: '$75.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$75.00' },
                ],
            })
            await svc.patchTransaction(patch)

            const found = await svc.findTransactionById(created.id)
            expect(found!.entries).toHaveLength(2)
            expect(found!.entries.map((e) => e.acctId)).toEqual([acctC, acctB])
            expect(found!.entries[0]!.debit as string).toBe('$75.00')
        })

        it('throws when patching an unknown id', async () => {
            const { svc } = makeSvc()
            const patch = transactionPatchEventSchema.parse({ id: genTxnId(), origId: genOrigId(), description: 'X' })
            await expect(svc.patchTransaction(patch)).rejects.toThrow()
        })
    })

    describe('deleteTransaction', () => {
        it('soft-deletes: findTransactionById still resolves it', async () => {
            const { svc } = makeSvc()
            const created = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-15', description: 'To delete',
                entries: [
                    { acctId: acctA, debit: '$10.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$10.00' },
                ],
            })
            await svc.createTransaction(created)

            const deletion = transactionDeletionEventSchema.parse({ id: created.id, origId: genOrigId() })
            await svc.deleteTransaction(deletion)

            const found = await svc.findTransactionById(created.id)
            expect(found).not.toBeNull()
            expect(found!.origId).toBe(deletion.origId)
        })

        it('throws when deleting an unknown id', async () => {
            const { svc } = makeSvc()
            const deletion = transactionDeletionEventSchema.parse({ id: genTxnId(), origId: genOrigId() })
            await expect(svc.deleteTransaction(deletion)).rejects.toThrow()
        })
    })

    describe('countTransactionsAll', () => {
        it('counts only non-deleted transactions', async () => {
            const { svc } = makeSvc()
            const a = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-15', description: 'A',
                entries: [
                    { acctId: acctA, debit: '$10.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$10.00' },
                ],
            })
            const b = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-16', description: 'B',
                entries: [
                    { acctId: acctA, debit: '$5.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$5.00' },
                ],
            })
            await svc.createTransaction(a)
            await svc.createTransaction(b)
            expect(await svc.countTransactionsAll()).toBe(2)

            await svc.deleteTransaction(transactionDeletionEventSchema.parse({ id: a.id, origId: genOrigId() }))
            expect(await svc.countTransactionsAll()).toBe(1)
        })
    })

    describe('findTransactionsByAccount', () => {
        it('returns only transactions touching the account, oldest first, breaking same-day ties by insertion order', async () => {
            const { svc } = makeSvc()
            const acctC = genAcctId()

            const early = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-10', description: 'Early',
                entries: [
                    { acctId: acctA, debit: '$10.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$10.00' },
                ],
            })
            const sameDayFirst = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-15', description: 'Same day, first',
                entries: [
                    { acctId: acctA, debit: '$20.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$20.00' },
                ],
            })
            const sameDaySecond = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-15', description: 'Same day, second',
                entries: [
                    { acctId: acctA, debit: '$30.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$30.00' },
                ],
            })
            const otherAccount = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-12', description: 'Not acctA',
                entries: [
                    { acctId: acctB, debit: '$40.00', credit: '$0.00' },
                    { acctId: acctC, debit: '$0.00', credit: '$40.00' },
                ],
            })

            await svc.createTransaction(early)
            await svc.createTransaction(sameDayFirst)
            await svc.createTransaction(otherAccount)
            await svc.createTransaction(sameDaySecond)

            const deleted = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-20', description: 'Deleted',
                entries: [
                    { acctId: acctA, debit: '$1.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$1.00' },
                ],
            })
            await svc.createTransaction(deleted)
            await svc.deleteTransaction(transactionDeletionEventSchema.parse({ id: deleted.id, origId: genOrigId() }))

            const found = await svc.findTransactionsByAccount(acctA)
            expect(found.map((t) => t.description as string)).toEqual(['Early', 'Same day, first', 'Same day, second'])
        })

        it('returns an empty array when the account has no transactions', async () => {
            const { svc } = makeSvc()
            expect(await svc.findTransactionsByAccount(genAcctId())).toEqual([])
        })
    })

    describe('findLatestTransactionForVendorAndAccount', () => {
        it('picks the most recent matching transaction, ignoring other vendors and other accounts', async () => {
            const { svc } = makeSvc()
            const vndrX = genVndrId()
            const vndrY = genVndrId()
            const acctC = genAcctId()

            const older = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-05', vndrId: vndrX, description: 'Older',
                entries: [
                    { acctId: acctA, debit: '$10.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$10.00' },
                ],
            })
            const newer = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-20', vndrId: vndrX, description: 'Newer',
                entries: [
                    { acctId: acctA, debit: '$15.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$15.00' },
                ],
            })
            const wrongVendor = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-25', vndrId: vndrY, description: 'Wrong vendor',
                entries: [
                    { acctId: acctA, debit: '$99.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$99.00' },
                ],
            })
            const wrongAccount = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-26', vndrId: vndrX, description: 'Wrong account',
                entries: [
                    { acctId: acctB, debit: '$99.00', credit: '$0.00' },
                    { acctId: acctC, debit: '$0.00', credit: '$99.00' },
                ],
            })

            await svc.createTransaction(older)
            await svc.createTransaction(newer)
            await svc.createTransaction(wrongVendor)
            await svc.createTransaction(wrongAccount)

            const found = await svc.findLatestTransactionForVendorAndAccount(vndrX, acctA)
            expect(found?.description as string).toBe('Newer')
        })

        it('returns null when there is no matching transaction', async () => {
            const { svc } = makeSvc()
            expect(await svc.findLatestTransactionForVendorAndAccount(genVndrId(), genAcctId())).toBeNull()
        })
    })

    describe('findAccountBalancesAsOf', () => {
        it('sums multiple entries per account', async () => {
            const { svc } = makeSvc()
            const first = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-10', description: 'First',
                entries: [
                    { acctId: acctA, debit: '$100.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$100.00' },
                ],
            })
            const second = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-11', description: 'Second',
                entries: [
                    { acctId: acctA, debit: '$50.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$50.00' },
                ],
            })
            await svc.createTransaction(first)
            await svc.createTransaction(second)

            const balances = await svc.findAccountBalancesAsOf(isoDateSchema.parse('2026-01-31'))
            const acctABalance = balances.find((b) => b.acctId === acctA)
            const acctBBalance = balances.find((b) => b.acctId === acctB)
            expect(acctABalance!.debit as string).toBe('$150.00')
            expect(acctABalance!.credit as string).toBe('$0.00')
            expect(acctBBalance!.debit as string).toBe('$0.00')
            expect(acctBBalance!.credit as string).toBe('$150.00')
        })

        it('excludes entries whose transaction is soft-deleted', async () => {
            const { svc } = makeSvc()
            const kept = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-10', description: 'Kept',
                entries: [
                    { acctId: acctA, debit: '$10.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$10.00' },
                ],
            })
            const deleted = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-11', description: 'Deleted',
                entries: [
                    { acctId: acctA, debit: '$999.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$999.00' },
                ],
            })
            await svc.createTransaction(kept)
            await svc.createTransaction(deleted)
            await svc.deleteTransaction(transactionDeletionEventSchema.parse({ id: deleted.id, origId: genOrigId() }))

            const balances = await svc.findAccountBalancesAsOf(isoDateSchema.parse('2026-01-31'))
            const acctABalance = balances.find((b) => b.acctId === acctA)
            expect(acctABalance!.debit as string).toBe('$10.00')
        })

        it('excludes entries whose transaction postDate is after asOfDate, includes postDate equal to asOfDate', async () => {
            const { svc } = makeSvc()
            const onDate = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-15', description: 'On date',
                entries: [
                    { acctId: acctA, debit: '$10.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$10.00' },
                ],
            })
            const afterDate = transactionCreationEventSchema.parse({
                id: genTxnId(), origId: genOrigId(), postDate: '2026-01-16', description: 'After date',
                entries: [
                    { acctId: acctA, debit: '$999.00', credit: '$0.00' },
                    { acctId: acctB, debit: '$0.00', credit: '$999.00' },
                ],
            })
            await svc.createTransaction(onDate)
            await svc.createTransaction(afterDate)

            const balances = await svc.findAccountBalancesAsOf(isoDateSchema.parse('2026-01-15'))
            const acctABalance = balances.find((b) => b.acctId === acctA)
            expect(acctABalance!.debit as string).toBe('$10.00')
        })

        it('an account with no qualifying entries is simply absent from the result', async () => {
            const { svc } = makeSvc()
            const balances = await svc.findAccountBalancesAsOf(isoDateSchema.parse('2026-01-31'))
            expect(balances.find((b) => b.acctId === genAcctId())).toBeUndefined()
            expect(balances).toEqual([])
        })
    })
})
