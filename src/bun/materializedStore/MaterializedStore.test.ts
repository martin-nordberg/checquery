import { describe, expect, it } from 'bun:test'
import { MaterializedStore } from './MaterializedStore'
import { createInMemoryActionLog } from '../actionLog/inMemory'
import { accountCreationEventSchema, accountPatchEventSchema } from '../../shared/domain/accounts/Account'
import { genAcctId } from '../../shared/domain/accounts/AcctId'
import { acctIdAssets } from '../../shared/domain/accounts/AcctRoot'
import { vendorCreationEventSchema, vendorDeletionEventSchema } from '../../shared/domain/vendors/Vendor'
import { genVndrId } from '../../shared/domain/vendors/VndrId'
import { transactionCreationEventSchema } from '../../shared/domain/transactions/Transaction'
import { genTxnId } from '../../shared/domain/transactions/TxnId'
import { balanceAssertionCreationEventSchema } from '../../shared/domain/balanceAssertions/BalanceAssertion'
import { genAsrtId } from '../../shared/domain/balanceAssertions/AsrtId'
import { originCreationEventSchema } from '../../shared/domain/origins/Origin'
import { genOrigId } from '../../shared/domain/origins/OrigId'

describe('MaterializedStore construction', () => {
    it('produces working, empty cmdSvcs/qrySvcs bundles', async () => {
        const store = new MaterializedStore()
        expect(await store.qrySvcs.accounts.findAccountsAll()).toEqual([])
        expect(await store.qrySvcs.vendors.findVendorsAll()).toEqual([])
        expect(await store.qrySvcs.balanceAssertions.findBalanceAssertionsAll()).toEqual([])
        expect(await store.qrySvcs.origins.findOriginsAll()).toEqual([])
    })

    it('constructs independent instances -- writing to one does not affect another', async () => {
        const storeA = new MaterializedStore()
        const storeB = new MaterializedStore()

        const origin = originCreationEventSchema.parse({ id: genOrigId(), name: 'Jane', ipAddress: '1.2.3.4' })
        await storeA.cmdSvcs.origins.createOrigin(origin)

        expect(await storeA.qrySvcs.origins.findOriginsAll()).toHaveLength(1)
        expect(await storeB.qrySvcs.origins.findOriginsAll()).toHaveLength(0)
    })
})

describe('replaying an ActionLog into a MaterializedStore', () => {
    it('leaves the store reflecting the fully-replayed state across every entity', async () => {
        const actionLog = createInMemoryActionLog()

        const acctId = genAcctId()
        const acctId2 = genAcctId()
        const vndrId = genVndrId()
        const txnId = genTxnId()
        const asrtId = genAsrtId()
        const origId = genOrigId()

        // Live user activity, appended straight through the log -- exactly what a real XxxTeeSvc would do.
        await actionLog.cmdSvcs.origins.createOrigin(
            originCreationEventSchema.parse({ id: origId, name: 'Jane', ipAddress: '10.0.0.1' }),
        )
        await actionLog.cmdSvcs.accounts.createAccount(
            accountCreationEventSchema.parse({
                id: acctId, origId, parentId: acctIdAssets, acctType: 'ASSET', name: 'Checking',
            }),
        )
        await actionLog.cmdSvcs.accounts.createAccount(
            accountCreationEventSchema.parse({
                id: acctId2, origId, parentId: acctIdAssets, acctType: 'ASSET', name: 'Savings',
            }),
        )
        await actionLog.cmdSvcs.accounts.patchAccount(
            accountPatchEventSchema.parse({ id: acctId, origId, name: 'Primary Checking' }),
        )
        await actionLog.cmdSvcs.vendors.createVendor(
            vendorCreationEventSchema.parse({ id: vndrId, origId, name: 'Acme Corp' }),
        )
        const deletedVndrId = genVndrId()
        await actionLog.cmdSvcs.vendors.createVendor(
            vendorCreationEventSchema.parse({ id: deletedVndrId, origId, name: 'Gone Vendor' }),
        )
        await actionLog.cmdSvcs.vendors.deleteVendor(
            vendorDeletionEventSchema.parse({ id: deletedVndrId, origId }),
        )
        await actionLog.cmdSvcs.transactions.createTransaction(
            transactionCreationEventSchema.parse({
                id: txnId,
                origId,
                postDate: '2026-01-15',
                vndrId,
                entries: [
                    { acctId, debit: '$50.00', credit: '$0.00' },
                    { acctId: acctId2, debit: '$0.00', credit: '$50.00' },
                ],
            }),
        )
        await actionLog.cmdSvcs.balanceAssertions.createBalanceAssertion(
            balanceAssertionCreationEventSchema.parse({
                id: asrtId, origId, acctId, clearedDate: '2026-01-31', balance: '$50.00',
            }),
        )

        const store = new MaterializedStore()
        await actionLog.replayInto(store.cmdSvcs)

        const account = await store.qrySvcs.accounts.findAccountById(acctId)
        expect(account!.name as string).toBe('Primary Checking')

        const allAccounts = await store.qrySvcs.accounts.findAccountsAll()
        expect(allAccounts).toHaveLength(2)

        const vendor = await store.qrySvcs.vendors.findVendorById(vndrId)
        expect(vendor!.name as string).toBe('Acme Corp')

        // The deleted vendor still resolves by id (soft-delete asymmetry) but is excluded from findVendorsAll.
        const deletedVendor = await store.qrySvcs.vendors.findVendorById(deletedVndrId)
        expect(deletedVendor).not.toBeNull()
        const allVendors = await store.qrySvcs.vendors.findVendorsAll()
        expect(allVendors.map((v) => v.id)).not.toContain(deletedVndrId)

        const transaction = await store.qrySvcs.transactions.findTransactionById(txnId)
        expect(transaction!.vndrId).toBe(vndrId)
        expect(transaction!.entries).toHaveLength(2)

        const assertions = await store.qrySvcs.balanceAssertions.findBalanceAssertionsAll()
        expect(assertions).toHaveLength(1)
        expect(assertions[0]!.balance as string).toBe('$50.00')

        const origin = await store.qrySvcs.origins.findOriginById(origId)
        expect(origin!.name as string).toBe('Jane')

        // The account is now in use (live transaction entry) -- proves cross-entity queries work post-replay.
        expect(await store.qrySvcs.accounts.isAccountInUse(acctId)).toBe(true)
        expect(await store.qrySvcs.vendors.isVendorInUse(vndrId)).toBe(true)
    })
})
