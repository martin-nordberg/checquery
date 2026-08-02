import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'
import { createSchema } from '../schema'
import { AccountMaterializedStoreSvc } from './AccountMaterializedStoreSvc'
import {
    accountCreationEventSchema,
    accountDeletionEventSchema,
    accountPatchEventSchema,
} from '../../../shared/domain/accounts/Account'
import { genAcctId } from '../../../shared/domain/accounts/AcctId'
import { acctIdAssets } from '../../../shared/domain/accounts/AcctRoot'
import { genOrigId } from '../../../shared/domain/origins/OrigId'
import { genVndrId } from '../../../shared/domain/vendors/VndrId'
import { genTxnId } from '../../../shared/domain/transactions/TxnId'

function makeSvc() {
    const db = new Database(':memory:')
    createSchema(db)
    return { db, svc: new AccountMaterializedStoreSvc(db) }
}

describe('AccountMaterializedStoreSvc', () => {
    describe('createAccount / findAccountById / findAccountsAll', () => {
        it('creates an account retrievable by id', async () => {
            const { svc } = makeSvc()
            const event = accountCreationEventSchema.parse({
                id: genAcctId(),
                origId: genOrigId(),
                parentId: acctIdAssets,
                acctType: 'ASSET',
                name: 'Checking',
                description: 'My checking account',
                isPrimary: true,
            })

            await svc.createAccount(event)
            const found = await svc.findAccountById(event.id)

            expect(found).not.toBeNull()
            expect(found!.id).toBe(event.id)
            expect(found!.origId).toBe(event.origId)
            expect(found!.parentId).toBe(acctIdAssets)
            expect(found!.name as string).toBe('Checking')
            expect(found!.description as string).toBe('My checking account')
            expect(found!.isPrimary).toBe(true)
        })

        it('findAccountsAll only returns non-deleted accounts, ordered by name', async () => {
            const { svc } = makeSvc()
            const b = accountCreationEventSchema.parse({
                id: genAcctId(), origId: genOrigId(), parentId: acctIdAssets, acctType: 'ASSET', name: 'B account',
            })
            const a = accountCreationEventSchema.parse({
                id: genAcctId(), origId: genOrigId(), parentId: acctIdAssets, acctType: 'ASSET', name: 'A account',
            })
            await svc.createAccount(b)
            await svc.createAccount(a)

            const all = await svc.findAccountsAll()
            expect(all.map((acct) => acct.name as string)).toEqual(['A account', 'B account'])
        })

        it('findAccountById returns null for an unknown id', async () => {
            const { svc } = makeSvc()
            expect(await svc.findAccountById(genAcctId())).toBeNull()
        })
    })

    describe('patchAccount', () => {
        it('updates only the fields present on the patch, leaving others unchanged', async () => {
            const { svc } = makeSvc()
            const created = accountCreationEventSchema.parse({
                id: genAcctId(), origId: genOrigId(), parentId: acctIdAssets, acctType: 'ASSET', name: 'Original',
                description: 'original description', isPrimary: false,
            })
            await svc.createAccount(created)

            const patch = accountPatchEventSchema.parse({
                id: created.id,
                origId: genOrigId(),
                name: 'Renamed',
            })
            await svc.patchAccount(patch)

            const found = await svc.findAccountById(created.id)
            expect(found!.name as string).toBe('Renamed')
            expect(found!.description as string).toBe('original description')
            expect(found!.isPrimary).toBe(false)
            expect(found!.origId).toBe(patch.origId)
        })

        it('throws when patching an unknown id', async () => {
            const { svc } = makeSvc()
            const patch = accountPatchEventSchema.parse({ id: genAcctId(), origId: genOrigId(), name: 'X' })
            await expect(svc.patchAccount(patch)).rejects.toThrow()
        })
    })

    describe('deleteAccount', () => {
        it('soft-deletes: findAccountById still resolves it, findAccountsAll excludes it', async () => {
            const { svc } = makeSvc()
            const created = accountCreationEventSchema.parse({
                id: genAcctId(), origId: genOrigId(), parentId: acctIdAssets, acctType: 'ASSET', name: 'Deleted Acct',
            })
            await svc.createAccount(created)

            const deletion = accountDeletionEventSchema.parse({ id: created.id, origId: genOrigId() })
            await svc.deleteAccount(deletion)

            const byId = await svc.findAccountById(created.id)
            expect(byId).not.toBeNull()
            expect(byId!.name as string).toBe('Deleted Acct')
            expect(byId!.origId).toBe(deletion.origId)

            const all = await svc.findAccountsAll()
            expect(all.find((acct) => acct.id === created.id)).toBeUndefined()
        })

        it('throws when deleting an unknown id', async () => {
            const { svc } = makeSvc()
            const deletion = accountDeletionEventSchema.parse({ id: genAcctId(), origId: genOrigId() })
            await expect(svc.deleteAccount(deletion)).rejects.toThrow()
        })
    })

    describe('isAccountInUse', () => {
        it('is false for an account nothing references', async () => {
            const { svc } = makeSvc()
            const created = accountCreationEventSchema.parse({
                id: genAcctId(), origId: genOrigId(), parentId: acctIdAssets, acctType: 'ASSET', name: 'Unused',
            })
            await svc.createAccount(created)
            expect(await svc.isAccountInUse(created.id)).toBe(false)
        })

        it('is true when referenced by a live transaction entry', async () => {
            const { db, svc } = makeSvc()
            const created = accountCreationEventSchema.parse({
                id: genAcctId(), origId: genOrigId(), parentId: acctIdAssets, acctType: 'ASSET', name: 'Used',
            })
            await svc.createAccount(created)

            const txnId = genTxnId()
            db.run(
                `INSERT INTO transactions (id, orig_id, post_date, code, description, needs_review) VALUES (?, ?, ?, ?, ?, ?)`,
                [txnId, genOrigId(), '2026-01-01', '', 'test txn', 0],
            )
            db.run(
                `INSERT INTO entries (transaction_id, ordinal, acct_id, debit_cents, credit_cents) VALUES (?, ?, ?, ?, ?)`,
                [txnId, 0, created.id, 100, 0],
            )

            expect(await svc.isAccountInUse(created.id)).toBe(true)

            db.run(`UPDATE transactions SET is_deleted = 1 WHERE id = ?`, [txnId])
            expect(await svc.isAccountInUse(created.id)).toBe(false)
        })

        it('is true when referenced as a live vendor default account', async () => {
            const { db, svc } = makeSvc()
            const created = accountCreationEventSchema.parse({
                id: genAcctId(), origId: genOrigId(), parentId: acctIdAssets, acctType: 'ASSET', name: 'Default Acct',
            })
            await svc.createAccount(created)

            const vndrId = genVndrId()
            db.run(
                `INSERT INTO vendors (id, orig_id, name, description, default_acct_id, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
                [vndrId, genOrigId(), 'A Vendor', '', created.id, 1],
            )

            expect(await svc.isAccountInUse(created.id)).toBe(true)

            db.run(`UPDATE vendors SET is_deleted = 1 WHERE id = ?`, [vndrId])
            expect(await svc.isAccountInUse(created.id)).toBe(false)
        })
    })
})
