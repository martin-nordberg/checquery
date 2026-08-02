import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'
import { createSchema } from '../schema'
import { BalanceAssertionMaterializedStoreSvc } from './BalanceAssertionMaterializedStoreSvc'
import {
    balanceAssertionCreationEventSchema,
    balanceAssertionDeletionEventSchema,
    balanceAssertionPatchEventSchema,
} from '../../../../shared/domain/balanceAssertions/BalanceAssertion'
import { genAsrtId } from '../../../../shared/domain/balanceAssertions/AsrtId'
import { genAcctId } from '../../../../shared/domain/accounts/AcctId'
import { genOrigId } from '../../../../shared/domain/origins/OrigId'

function makeSvc() {
    const db = new Database(':memory:')
    createSchema(db)
    return { db, svc: new BalanceAssertionMaterializedStoreSvc(db) }
}

describe('BalanceAssertionMaterializedStoreSvc', () => {
    describe('createBalanceAssertion / findBalanceAssertionById / findBalanceAssertionsAll', () => {
        it('creates a balance assertion retrievable by id, storing balance as cents and reading it back as CurrencyAmt', async () => {
            const { svc } = makeSvc()
            const event = balanceAssertionCreationEventSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '$1,234.56',
            })

            await svc.createBalanceAssertion(event)
            const found = await svc.findBalanceAssertionById(event.id)

            expect(found).not.toBeNull()
            expect(found!.acctId).toBe(event.acctId)
            expect(found!.clearedDate as string).toBe('2026-01-31')
            expect(found!.balance as string).toBe('$1,234.56')
        })

        it('round-trips a negative balance', async () => {
            const { svc } = makeSvc()
            const event = balanceAssertionCreationEventSchema.parse({
                id: genAsrtId(), origId: genOrigId(), acctId: genAcctId(), clearedDate: '2026-01-31', balance: '($500.00)',
            })
            await svc.createBalanceAssertion(event)
            const found = await svc.findBalanceAssertionById(event.id)
            expect(found!.balance as string).toBe('($500.00)')
        })

        it('findBalanceAssertionsAll only returns non-deleted assertions, ordered by clearedDate', async () => {
            const { svc } = makeSvc()
            const later = balanceAssertionCreationEventSchema.parse({
                id: genAsrtId(), origId: genOrigId(), acctId: genAcctId(), clearedDate: '2026-02-28', balance: '$1.00',
            })
            const earlier = balanceAssertionCreationEventSchema.parse({
                id: genAsrtId(), origId: genOrigId(), acctId: genAcctId(), clearedDate: '2026-01-31', balance: '$1.00',
            })
            await svc.createBalanceAssertion(later)
            await svc.createBalanceAssertion(earlier)

            const all = await svc.findBalanceAssertionsAll()
            expect(all.map((a) => a.clearedDate as string)).toEqual(['2026-01-31', '2026-02-28'])
        })
    })

    describe('patchBalanceAssertion', () => {
        it('updates only the fields present on the patch', async () => {
            const { svc } = makeSvc()
            const created = balanceAssertionCreationEventSchema.parse({
                id: genAsrtId(), origId: genOrigId(), acctId: genAcctId(), clearedDate: '2026-01-31', balance: '$100.00',
            })
            await svc.createBalanceAssertion(created)

            const patch = balanceAssertionPatchEventSchema.parse({
                id: created.id, origId: genOrigId(), balance: '$200.00',
            })
            await svc.patchBalanceAssertion(patch)

            const found = await svc.findBalanceAssertionById(created.id)
            expect(found!.balance as string).toBe('$200.00')
            expect(found!.clearedDate as string).toBe('2026-01-31')
        })

        it('throws when patching an unknown id', async () => {
            const { svc } = makeSvc()
            const patch = balanceAssertionPatchEventSchema.parse({ id: genAsrtId(), origId: genOrigId(), balance: '$1.00' })
            await expect(svc.patchBalanceAssertion(patch)).rejects.toThrow()
        })
    })

    describe('deleteBalanceAssertion', () => {
        it('soft-deletes: findById still resolves it, findAll excludes it', async () => {
            const { svc } = makeSvc()
            const created = balanceAssertionCreationEventSchema.parse({
                id: genAsrtId(), origId: genOrigId(), acctId: genAcctId(), clearedDate: '2026-01-31', balance: '$1.00',
            })
            await svc.createBalanceAssertion(created)

            const deletion = balanceAssertionDeletionEventSchema.parse({ id: created.id, origId: genOrigId() })
            await svc.deleteBalanceAssertion(deletion)

            expect(await svc.findBalanceAssertionById(created.id)).not.toBeNull()
            const all = await svc.findBalanceAssertionsAll()
            expect(all.find((a) => a.id === created.id)).toBeUndefined()
        })

        it('throws when deleting an unknown id', async () => {
            const { svc } = makeSvc()
            const deletion = balanceAssertionDeletionEventSchema.parse({ id: genAsrtId(), origId: genOrigId() })
            await expect(svc.deleteBalanceAssertion(deletion)).rejects.toThrow()
        })
    })

    describe('countBalanceAssertionsAll', () => {
        it('counts only non-deleted balance assertions', async () => {
            const { svc } = makeSvc()
            const a = balanceAssertionCreationEventSchema.parse({
                id: genAsrtId(), origId: genOrigId(), acctId: genAcctId(), clearedDate: '2026-01-31', balance: '$1.00',
            })
            const b = balanceAssertionCreationEventSchema.parse({
                id: genAsrtId(), origId: genOrigId(), acctId: genAcctId(), clearedDate: '2026-02-28', balance: '$2.00',
            })
            await svc.createBalanceAssertion(a)
            await svc.createBalanceAssertion(b)
            expect(await svc.countBalanceAssertionsAll()).toBe(2)

            await svc.deleteBalanceAssertion(balanceAssertionDeletionEventSchema.parse({ id: a.id, origId: genOrigId() }))
            expect(await svc.countBalanceAssertionsAll()).toBe(1)
        })
    })
})
