import {describe, expect, it} from 'bun:test'
import {resolve} from 'path'
import {createPgLiteDb} from "$shared/database/PgLiteDb";
import {runChecqueryPgDdl} from "$shared/database/CheckqueryPgDdl";
import {AccountRepo} from "$shared/database/accounts/AccountRepo";
import {VendorRepo} from "$shared/database/vendors/VendorRepo";
import {TransactionRepo} from "$shared/database/transactions/TransactionRepo";
import {StatementRepo} from "$shared/database/statements/StatementRepo";
import {loadChecqueryLog} from "$shared/events/ChecqueryEventLoader";
import {toCents} from "$shared/domain/core/CurrencyAmt";
import {IncomeStatementRepo} from "$shared/database/incomestatement/IncomeStatementRepo";

describe('Create income statement', () => {
    it('computes an income statement that balances', async () => {
        // Point to test YAML file
        const testFile = resolve(__dirname, '../../../../data/checquery-log.yaml')

        const db = await createPgLiteDb("010")
        await runChecqueryPgDdl(db)

        const acctSvc = new AccountRepo(db)
        const vendorSvc = new VendorRepo(db)
        const txnSvc = new TransactionRepo(db)
        const stmtSvc = new StatementRepo(db)

        await loadChecqueryLog(testFile, acctSvc, txnSvc, vendorSvc, stmtSvc)

        const isRepo = new IncomeStatementRepo(db)

        const is = await isRepo.findIncomeStatement("2026-01-01", "2026-01-31")

        expect(toCents(is.totalIncome)).toBeGreaterThan(0)
        expect(toCents(is.totalIncome) - toCents(is.totalExpenses) - toCents(is.netIncome)).toEqual(0)

        const isDetails = await isRepo.findIncomeStatementDetails("2026-01-01", "2026-01-31")

        expect(isDetails.totalIncome).toEqual(is.totalIncome)
        expect(isDetails.totalExpenses).toEqual(is.totalExpenses)

        await db.close()
    })
})