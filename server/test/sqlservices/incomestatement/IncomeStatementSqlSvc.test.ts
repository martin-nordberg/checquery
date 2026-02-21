import {describe, expect, it, beforeAll} from 'bun:test'
import {ChecquerySqlDb} from '../../../src/sqldb/ChecquerySqlDb'
import {runChecqueryDdl} from '../../../src/sqldb/checqueryDdl'
import {AccountSqlService} from '../../../src/sqlservices/accounts/AccountSqlSvc'
import {VendorSqlService} from '../../../src/sqlservices/vendors/VendorSqlSvc'
import {TransactionSqlService} from '../../../src/sqlservices/transactions/TransactionSqlSvc'
import {StatementSqlService} from '../../../src/sqlservices/statements/StatementSqlSvc'
import {IncomeStatementSqlService} from '../../../src/sqlservices/incomestatement/IncomeStatementSqlSvc'
import {loadChecqueryLog} from '../../../src/eventsources/ChecqueryEvents'
import {toCents, currencyAmtRegex} from '$shared/domain/core/CurrencyAmt'
import {resolve} from 'path'

describe('IncomeStatementSqlService', () => {
    let incStmtSvc: IncomeStatementSqlService

    beforeAll(async () => {
        const testFile = resolve(__dirname, '../../../../data/checquery-test-log-2010.yaml')
        process.env['CHECQUERY_LOG_FILE'] = testFile

        const db = new ChecquerySqlDb()
        runChecqueryDdl(db)

        const acctSvc = new AccountSqlService(db, false)
        const vendorSvc = new VendorSqlService(db, false)
        const txnSvc = new TransactionSqlService(db)
        const stmtSvc = new StatementSqlService(db, false)

        await loadChecqueryLog({acctSvc, txnSvc, vendorSvc, stmtSvc})

        incStmtSvc = new IncomeStatementSqlService(db)
    })

    describe('findIncomeStatement (summary)', () => {
        it('returns valid summary for full year 2010', async () => {
            const is = await incStmtSvc.findIncomeStatement('2010-01-01', '2010-12-31')

            // Verify structure has non-empty arrays
            expect(is.incomeLineItems.length).toBeGreaterThan(0)
            expect(is.expenseLineItems.length).toBeGreaterThan(0)

            // Verify totals match currency format and are non-zero
            expect(is.totalIncome).toMatch(currencyAmtRegex)
            expect(is.totalExpenses).toMatch(currencyAmtRegex)
            expect(is.netIncome).toMatch(currencyAmtRegex)
            expect(toCents(is.totalIncome)).toBeGreaterThan(0)
            expect(toCents(is.totalExpenses)).toBeGreaterThan(0)

            // Verify netIncome = totalIncome - totalExpenses
            expect(toCents(is.netIncome)).toBe(toCents(is.totalIncome) - toCents(is.totalExpenses))

            // Verify dates are echoed back
            expect(is.startDate).toBe('2010-01-01')
            expect(is.endDate).toBe('2010-12-31')
        })

        it('returns expected income and expense accounts', async () => {
            const is = await incStmtSvc.findIncomeStatement('2010-01-01', '2010-12-31')

            // Verify specific income accounts exist
            expect(is.incomeLineItems.some(li => li.description.includes('Salary'))).toBe(true)

            // Verify specific expense accounts exist
            expect(is.expenseLineItems.some(li => li.description.includes('Groceries'))).toBe(true)
            expect(is.expenseLineItems.some(li => li.description.includes('Utilities'))).toBe(true)

            // All line items should have valid currency amounts
            for (const li of is.incomeLineItems) {
                expect(li.amount).toMatch(currencyAmtRegex)
            }
            for (const li of is.expenseLineItems) {
                expect(li.amount).toMatch(currencyAmtRegex)
            }
        })

        it('returns different totals for different periods', async () => {
            const isQ1 = await incStmtSvc.findIncomeStatement('2010-01-01', '2010-03-31')
            const isQ2 = await incStmtSvc.findIncomeStatement('2010-04-01', '2010-06-30')
            const isFull = await incStmtSvc.findIncomeStatement('2010-01-01', '2010-12-31')

            // Quarterly totals should differ from each other
            expect(isQ1.totalIncome).not.toBe(isQ2.totalIncome)

            // Full year income should be greater than any single quarter
            expect(toCents(isFull.totalIncome)).toBeGreaterThan(toCents(isQ1.totalIncome))
            expect(toCents(isFull.totalExpenses)).toBeGreaterThan(toCents(isQ1.totalExpenses))
        })
    })

    describe('findIncomeStatementDetails', () => {
        it('returns valid details for full year 2010', async () => {
            const details = await incStmtSvc.findIncomeStatementDetails('2010-01-01', '2010-12-31')

            // Verify structure has non-empty arrays
            expect(details.incomeLineItems.length).toBeGreaterThan(0)
            expect(details.expenseLineItems.length).toBeGreaterThan(0)

            // Verify totals match currency format and are non-zero
            expect(details.totalIncome).toMatch(currencyAmtRegex)
            expect(details.totalExpenses).toMatch(currencyAmtRegex)
            expect(details.netIncome).toMatch(currencyAmtRegex)
            expect(toCents(details.totalIncome)).toBeGreaterThan(0)
            expect(toCents(details.totalExpenses)).toBeGreaterThan(0)

            // Verify netIncome = totalIncome - totalExpenses
            expect(toCents(details.netIncome)).toBe(toCents(details.totalIncome) - toCents(details.totalExpenses))

            // Verify dates are echoed back
            expect(details.startDate).toBe('2010-01-01')
            expect(details.endDate).toBe('2010-12-31')
        })

        it('each detail line item has entries that sum to its total', async () => {
            const details = await incStmtSvc.findIncomeStatementDetails('2010-01-01', '2010-12-31')

            for (const li of details.expenseLineItems) {
                expect(li.entries.length).toBeGreaterThan(0)
                expect(li.accountName).toBeTruthy()
                expect(li.totalAmount).toMatch(currencyAmtRegex)

                // Sum of entry amounts should equal the line item total
                const entrySumCents = li.entries.reduce((sum, e) => sum + toCents(e.amount), 0)
                expect(entrySumCents).toBe(toCents(li.totalAmount))
            }

            for (const li of details.incomeLineItems) {
                expect(li.entries.length).toBeGreaterThan(0)
                expect(li.accountName).toBeTruthy()
                expect(li.totalAmount).toMatch(currencyAmtRegex)

                const entrySumCents = li.entries.reduce((sum, e) => sum + toCents(e.amount), 0)
                expect(entrySumCents).toBe(toCents(li.totalAmount))
            }
        })

        it('entry details have valid dates and amounts', async () => {
            const details = await incStmtSvc.findIncomeStatementDetails('2010-01-01', '2010-12-31')

            const allEntries = [
                ...details.expenseLineItems.flatMap(li => li.entries),
                ...details.incomeLineItems.flatMap(li => li.entries),
            ]

            expect(allEntries.length).toBeGreaterThan(0)

            for (const entry of allEntries) {
                // Date should be within the requested period
                expect(entry.date >= '2010-01-01').toBe(true)
                expect(entry.date <= '2010-12-31').toBe(true)

                // Amount should be valid currency
                expect(entry.amount).toMatch(currencyAmtRegex)
            }
        })

        it('summary and detail totals agree', async () => {
            const summary = await incStmtSvc.findIncomeStatement('2010-01-01', '2010-12-31')
            const details = await incStmtSvc.findIncomeStatementDetails('2010-01-01', '2010-12-31')

            // Summary and detail totals should match
            expect(details.totalIncome).toBe(summary.totalIncome)
            expect(details.totalExpenses).toBe(summary.totalExpenses)
            expect(details.netIncome).toBe(summary.netIncome)

            // Same number of account line items
            expect(details.incomeLineItems.length).toBe(summary.incomeLineItems.length)
            expect(details.expenseLineItems.length).toBe(summary.expenseLineItems.length)
        })
    })
})
