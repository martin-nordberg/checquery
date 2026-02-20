import {describe, expect, it} from 'bun:test'
import {resolve} from 'path'
import {createPgLiteDb} from "$shared/database/PgLiteDb";
import {runChecqueryPgDdl} from "$shared/database/CheckqueryPgDdl";
import {AccountRepo} from "$shared/database/accounts/AccountRepo";
import {VendorRepo} from "$shared/database/vendors/VendorRepo";
import {TransactionRepo} from "$shared/database/transactions/TransactionRepo";
import {StatementRepo} from "$shared/database/statements/StatementRepo";
import {loadChecqueryLog} from "$shared/events/ChecqueryEventLoader";
import {z} from "zod";

describe('Load test data', () => {
    it('loads checquery-log.yaml without errors', async () => {
        // Point to test YAML file
        const testFile = resolve(__dirname, '../../../data/checquery-log.yaml')

        const db = await createPgLiteDb("010")
        await runChecqueryPgDdl(db)

        const acctSvc = new AccountRepo(db)
        const vendorSvc = new VendorRepo(db)
        const txnSvc = new TransactionRepo(db)
        const stmtSvc = new StatementRepo(db)

        await loadChecqueryLog(testFile, acctSvc, txnSvc, vendorSvc, stmtSvc)

        const countSchema = z.object({
            count: z.int()
        }).readonly()

        // Verify accounts loaded
        await db.transaction(async (txn) => {
            const acctCount = await txn.findOne('SELECT COUNT(*) as count FROM Account', [], countSchema)
            expect(acctCount!.count).toBeGreaterThan(10)
        })

        // Verify vendors loaded
        await db.transaction(async (txn) => {
            const vndrCount = await txn.findOne('SELECT COUNT(*) as count FROM Vendor', [], countSchema)
            expect(vndrCount!.count).toBeGreaterThan(10)
        })

        // Verify transactions loaded
        await db.transaction(async (txn) => {
            const txnCount = await txn.findOne('SELECT COUNT(*) as count FROM Transaxtion', [], countSchema)
            expect(txnCount!.count).toBeGreaterThan(10)

            const entryCount = await txn.findOne('SELECT COUNT(*) as count FROM Entry', [], countSchema)
            expect(entryCount!.count).toBeGreaterThan(10)
        })

        // Verify statements loaded
        await db.transaction(async (txn) => {
            const stmtCount = await txn.findOne('SELECT COUNT(*) as count FROM Statement', [], countSchema)
            expect(stmtCount!.count).toBeGreaterThan(0)
        })

        await db.close()

    })
})