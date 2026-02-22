import {describe, expect, it} from 'bun:test'
import {resolve} from 'path'
import {createPgLiteDb} from "$shared/database/PgLiteDb";
import {runChecqueryPgDdl} from "$shared/database/CheckqueryPgDdl";
import {AccountRepo} from "$shared/database/accounts/AccountRepo";
import {VendorRepo} from "$shared/database/vendors/VendorRepo";
import {TransactionRepo} from "$shared/database/transactions/TransactionRepo";
import {StatementRepo} from "$shared/database/statements/StatementRepo";
import {loadChecqueryLog} from "$shared/events/ChecqueryEventLoader";
import {BalanceSheetRepo} from "$shared/database/balancesheet/BalanceSheetRepo";
import {toCents} from "$shared/domain/core/CurrencyAmt";

describe('Create balance sheet', () => {
    it('computes a balance sheet that balances', async () => {
        // Point to test YAML file
        const testFile = resolve(__dirname, '../../../../data/checquery-log.yaml')

        const db = await createPgLiteDb("010")
        await runChecqueryPgDdl(db)

        const acctSvc = new AccountRepo(db)
        const vendorSvc = new VendorRepo(db)
        const txnSvc = new TransactionRepo(db)
        const stmtSvc = new StatementRepo(db)

        await loadChecqueryLog(testFile, acctSvc, txnSvc, vendorSvc, stmtSvc)

        const bsRepo = new BalanceSheetRepo(db)

        const bs = await bsRepo.findBalanceSheet("2026-01-31")

        expect(toCents(bs.totalAssets)).toBeGreaterThan(0)
        expect(toCents(bs.totalAssets) - toCents(bs.totalLiabilities) - toCents(bs.totalEquity)).toEqual(0)

        await db.close()
    })
})