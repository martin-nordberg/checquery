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
})
