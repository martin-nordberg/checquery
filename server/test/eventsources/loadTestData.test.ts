import {describe, expect, it} from 'bun:test'
import {ChecquerySqlDb} from '../../src/sqldb/ChecquerySqlDb'
import {runChecqueryDdl} from '../../src/sqldb/checqueryDdl'
import {AccountSqlService} from '../../src/sqlservices/accounts/AccountSqlSvc'
import {VendorSqlService} from '../../src/sqlservices/vendors/VendorSqlSvc'
import {TransactionSqlService} from '../../src/sqlservices/transactions/TransactionSqlSvc'
import {StatementSqlService} from '../../src/sqlservices/statements/StatementSqlSvc'
import {loadChecqueryLog} from '../../src/eventsources/ChecqueryEvents'
import {resolve} from 'path'

describe('Load test data', () => {
    it('loads checquery-test-log-2010.yaml without errors', async () => {
        // Point to test YAML file
        const testFile = resolve(__dirname, '../../../data/checquery-test-log-2010.yaml')
        process.env['CHECQUERY_LOG_FILE'] = testFile

        const db = new ChecquerySqlDb()
        runChecqueryDdl(db)

        const acctSvc = new AccountSqlService(db, false)
        const vendorSvc = new VendorSqlService(db, false)
        const txnSvc = new TransactionSqlService(db)
        const stmtSvc = new StatementSqlService(db, false)

        await loadChecqueryLog({acctSvc, txnSvc, vendorSvc, stmtSvc})

        // Verify accounts loaded
        const accounts = await acctSvc.findAccountsAll()
        expect(accounts.length).toBe(100)

        // Verify vendors loaded
        const vendors = await vendorSvc.findVendorsAll()
        expect(vendors.length).toBe(100)

        // Verify transactions loaded (count via raw SQL since findTransactionsAll has a join issue)
        const txnCount = db.db.query('SELECT COUNT(*) as cnt FROM Transaxtion').get() as {cnt: number}
        expect(txnCount.cnt).toBeGreaterThan(1900)

        // Verify entries loaded
        const entryCount = db.db.query('SELECT COUNT(*) as cnt FROM Entry').get() as {cnt: number}
        expect(entryCount.cnt).toBeGreaterThan(3800)

        // Verify statements loaded
        const statements = await stmtSvc.findStatementsAll()
        expect(statements.length).toBe(28)
    })
})
