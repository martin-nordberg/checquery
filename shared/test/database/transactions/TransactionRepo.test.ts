import {describe, expect, it} from 'bun:test'
import {genAcctId} from "$shared/domain/accounts/AcctId";
import {createPgLiteDb} from "$shared/database/PgLiteDb";
import {runChecqueryPgDdl} from "$shared/database/CheckqueryPgDdl";
import {AccountRepo} from "$shared/database/accounts/AccountRepo";
import {VendorRepo} from "$shared/database/vendors/VendorRepo";
import {genVndrId} from "$shared/domain/vendors/VndrId";
import type {Vendor} from "$shared/domain/vendors/Vendor";
import {TransactionRepo} from "$shared/database/transactions/TransactionRepo";
import {genTxnId} from "$shared/domain/transactions/TxnId";
import type {Transaction} from "$shared/domain/transactions/Transaction";

describe('Transaction Repo', () => {
    it('Should create, find, update, and delete a transaction', async () => {
        const db = await createPgLiteDb("F00")
        await runChecqueryPgDdl(db)
        const arepo = new AccountRepo(db)

        const aid1 = genAcctId()
        await arepo.createAccount({
            id: aid1,
            name: "Checking",
            acctNumber: "123-456",
            acctType: "ASSET",
            description: "An example asset account",
        })
        const acct1 = await arepo.findAccountById(aid1)

        const aid2 = genAcctId()
        await arepo.createAccount({
            id: aid2,
            name: "Stuff",
            acctNumber: "321-654",
            acctType: "EXPENSE",
            description: "An example expense account",
        })
        const acct2 = await arepo.findAccountById(aid2)

        const vrepo = new VendorRepo(db)

        const vid = genVndrId()
        const vndr0: Vendor = {
            id: vid,
            name: "Vendorr",
            description: "An example vendor",
            isActive: true
        }

        await vrepo.createVendor(vndr0)

        const repo = new TransactionRepo(db)

        const id = genTxnId()

        const txn0: Transaction = {
            id: id,
            code: "1234",
            description: "Bought something",
            date: "2010-01-02",
            vendor: vndr0.name,
            entries: [
                {
                    account: acct1!.name,
                    comment: "Not sure why entries have comments",
                    debit: "$123.99",
                    credit: "$0.00"
                },
                {
                    account: acct2!.name,
                    credit: "$123.99",
                    debit: "$0.00"
                }
            ]
        }
        await repo.createTransaction(txn0)

        const txn1 = await repo.findTransactionById(id)

        expect(txn1).toMatchObject(txn0)

        const txn2: Transaction = {
            id: id,
            code: "9945",
            description: "Bought sssomething",
            date: "2010-01-03",
            entries: [
                {
                    account: acct1!.name,
                    comment: "Entries have comments",
                    debit: "$123.00",
                    credit: "$0.00"
                },
                {
                    account: acct2!.name,
                    credit: "$123.00",
                    debit: "$0.00"
                }
            ]
        }

        await repo.updateTransaction({...txn2, vendor: ""})

        const txn3 = await repo.findTransactionById(id)

        expect(txn3).toMatchObject(txn2)

        await repo.deleteTransaction(id)

        const txn5 = await repo.findTransactionById(id)

        expect(txn5).toBeNull()

        await db.close()

    })

})