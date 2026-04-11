import {describe, expect, it} from 'bun:test'
import {resolve} from 'path'
import {createPgLiteDb} from "$shared/database/PgLiteDb";
import {runChecqueryPgDdl} from "$shared/database/CheckqueryPgDdl";
import {AccountRepo} from "$shared/database/accounts/AccountRepo";
import {VendorRepo} from "$shared/database/vendors/VendorRepo";
import {TransactionRepo} from "$shared/database/transactions/TransactionRepo";
import {StatementRepo} from "$shared/database/statements/StatementRepo";
import {loadChecqueryLog} from "../../../../server/src/events/ChecqueryEventLoader";
import {toCents} from "$shared/domain/core/CurrencyAmt";
import {IncomeStatementRepo} from "$shared/database/incomestatement/IncomeStatementRepo";
import type {
    IncomeStatement,
    IncomeStatementDetails,
    IncStmtDetailLineItem,
    IncStmtLineItem
} from "$shared/domain/incomestatement/IncomeStatement";
import type {PgLiteDb} from "$shared/database/PgLiteDb";

/** Helper to find a line item by description. */
const findLineItem = (items: IncStmtLineItem[], description: string): IncStmtLineItem => {
    const item = items.find(li => li.description === description)
    if (!item) {
        throw new Error(`Line item not found: ${description}`)
    }
    return item
}

/** Helper to find a detail line item by account name. */
const findDetailLineItem = (items: IncStmtDetailLineItem[], accountName: string): IncStmtDetailLineItem => {
    const item = items.find(li => li.accountName === accountName)
    if (!item) {
        throw new Error(`Detail line item not found: ${accountName}`)
    }
    return item
}

describe('IncomeStatement from checquery-test-log-2010', () => {
    let db: PgLiteDb
    let isRepo: IncomeStatementRepo

    it('loads test data', async () => {
        const testFile = resolve(__dirname, '../../../../data/checquery-test-log-2010.yaml')
        db = await createPgLiteDb("010")
        await runChecqueryPgDdl(db)

        const acctSvc = new AccountRepo(db)
        const vendorSvc = new VendorRepo(db)
        const txnSvc = new TransactionRepo(db)
        const stmtSvc = new StatementRepo(db)

        await loadChecqueryLog(testFile, acctSvc, txnSvc, vendorSvc, stmtSvc)

        isRepo = new IncomeStatementRepo(db)
    })

    describe('Q4 income statement (2010-Q4)', () => {
        let q4: IncomeStatement

        it('computes the income statement', async () => {
            q4 = await isRepo.findIncomeStatement("2010-Q4")
        })

        // --- Structure ---

        it('has the correct start date', () => {
            expect(q4.startDate).toBe("2010-10-01")
        })

        it('has the correct end date', () => {
            expect(q4.endDate).toBe("2010-12-31")
        })

        // --- Fundamental equation ---

        it('net income equals total income minus total expenses', () => {
            expect(toCents(q4.netIncome)).toBe(toCents(q4.totalIncome) - toCents(q4.totalExpenses))
        })

        // --- Sum cross-checks ---

        it('total income equals sum of all income line items', () => {
            const sum = q4.incomeLineItems.reduce((acc, li) => acc + toCents(li.amount), 0)
            expect(toCents(q4.totalIncome)).toBe(sum)
        })

        it('total expenses equals sum of all expense line items', () => {
            const sum = q4.expenseLineItems.reduce((acc, li) => acc + toCents(li.amount), 0)
            expect(toCents(q4.totalExpenses)).toBe(sum)
        })

        // --- Line item ordering ---

        it('sorts income line items alphabetically by description', () => {
            const descriptions = q4.incomeLineItems.map(li => li.description)
            const sorted = [...descriptions].sort()
            expect(descriptions).toEqual(sorted)
        })

        it('sorts expense line items alphabetically by description', () => {
            const descriptions = q4.expenseLineItems.map(li => li.description)
            const sorted = [...descriptions].sort()
            expect(descriptions).toEqual(sorted)
        })

        // --- Line item IDs ---

        it('every income line item has an acctId', () => {
            for (const item of q4.incomeLineItems) {
                expect(item.acctId).toBeDefined()
                expect(item.acctId!.startsWith('acct')).toBe(true)
            }
        })

        it('every expense line item has an acctId', () => {
            for (const item of q4.expenseLineItems) {
                expect(item.acctId).toBeDefined()
                expect(item.acctId!.startsWith('acct')).toBe(true)
            }
        })

        // --- Sign checks ---

        it('total income is positive', () => {
            expect(toCents(q4.totalIncome)).toBeGreaterThan(0)
        })

        it('total expenses is positive', () => {
            expect(toCents(q4.totalExpenses)).toBeGreaterThan(0)
        })

        it('all income line item amounts are positive', () => {
            for (const item of q4.incomeLineItems) {
                expect(toCents(item.amount)).toBeGreaterThan(0)
            }
        })

        it('all expense line item amounts are positive', () => {
            for (const item of q4.expenseLineItems) {
                expect(toCents(item.amount)).toBeGreaterThan(0)
            }
        })
    })

    describe('Q4 income statement details (2010-Q4)', () => {
        let details: IncomeStatementDetails

        it('computes the detailed income statement', async () => {
            details = await isRepo.findIncomeStatementDetails("2010-Q4")
        })

        it('has the correct date range', () => {
            expect(details.startDate).toBe("2010-10-01")
            expect(details.endDate).toBe("2010-12-31")
        })

        it('has matching totals with summary income statement', async () => {
            const summary = await isRepo.findIncomeStatement("2010-Q4")
            expect(details.totalIncome).toBe(summary.totalIncome)
            expect(details.totalExpenses).toBe(summary.totalExpenses)
            expect(details.netIncome).toBe(summary.netIncome)
        })

        it('net income equals total income minus total expenses', () => {
            expect(toCents(details.netIncome)).toBe(toCents(details.totalIncome) - toCents(details.totalExpenses))
        })

        it('each income detail totalAmount matches summary line item', async () => {
            const summary = await isRepo.findIncomeStatement("2010-Q4")
            for (const detailItem of details.incomeLineItems) {
                const summaryItem = findLineItem(summary.incomeLineItems, detailItem.accountName)
                expect(detailItem.totalAmount).toBe(summaryItem.amount)
            }
        })

        it('each expense detail totalAmount matches summary line item', async () => {
            const summary = await isRepo.findIncomeStatement("2010-Q4")
            for (const detailItem of details.expenseLineItems) {
                const summaryItem = findLineItem(summary.expenseLineItems, detailItem.accountName)
                expect(detailItem.totalAmount).toBe(summaryItem.amount)
            }
        })

        it('each income detail totalAmount equals sum of its entries', () => {
            for (const item of details.incomeLineItems) {
                const sum = item.entries.reduce((acc, e) => acc + toCents(e.amount), 0)
                expect(toCents(item.totalAmount)).toBe(sum)
            }
        })

        it('each expense detail totalAmount equals sum of its entries', () => {
            for (const item of details.expenseLineItems) {
                const sum = item.entries.reduce((acc, e) => acc + toCents(e.amount), 0)
                expect(toCents(item.totalAmount)).toBe(sum)
            }
        })

        it('all income detail entries have dates within the period', () => {
            for (const item of details.incomeLineItems) {
                for (const entry of item.entries) {
                    expect(entry.date >= "2010-10-01").toBe(true)
                    expect(entry.date <= "2010-12-31").toBe(true)
                }
            }
        })

        it('all expense detail entries have dates within the period', () => {
            for (const item of details.expenseLineItems) {
                for (const entry of item.entries) {
                    expect(entry.date >= "2010-10-01").toBe(true)
                    expect(entry.date <= "2010-12-31").toBe(true)
                }
            }
        })
    })

    describe('Q1 income statement (2010-Q1)', () => {
        let q1: IncomeStatement

        it('computes the Q1 income statement', async () => {
            q1 = await isRepo.findIncomeStatement("2010-Q1")
        })

        it('has the correct date range', () => {
            expect(q1.startDate).toBe("2010-01-01")
            expect(q1.endDate).toBe("2010-03-31")
        })

        it('net income equals total income minus total expenses', () => {
            expect(toCents(q1.netIncome)).toBe(toCents(q1.totalIncome) - toCents(q1.totalExpenses))
        })

        it('has correct Q1 total income', () => {
            expect(q1.totalIncome).toBe("$35,233.81")
        })

        it('has correct Q1 total expenses', () => {
            expect(q1.totalExpenses).toBe("$37,113.82")
        })

        it('has correct Q1 net income (negative)', () => {
            expect(q1.netIncome).toBe("($1,880.01)")
        })

        it('has 4 income line items (no freelance or reimbursements in Q1)', () => {
            expect(q1.incomeLineItems.length).toBe(4)
        })

        it('has correct Q1 Salary:Primary Employment', () => {
            expect(findLineItem(q1.incomeLineItems, "Salary : Primary Employment").amount).toBe("$20,800.00")
        })

        it('has correct Q1 Salary:Spouse Employment', () => {
            expect(findLineItem(q1.incomeLineItems, "Salary : Spouse Employment").amount).toBe("$14,400.00")
        })

        it('total income equals sum of income line items', () => {
            const sum = q1.incomeLineItems.reduce((acc, li) => acc + toCents(li.amount), 0)
            expect(toCents(q1.totalIncome)).toBe(sum)
        })

        it('total expenses equals sum of expense line items', () => {
            const sum = q1.expenseLineItems.reduce((acc, li) => acc + toCents(li.amount), 0)
            expect(toCents(q1.totalExpenses)).toBe(sum)
        })
    })

    describe('pre-data income statement (2009-Q1)', () => {
        let pre: IncomeStatement

        it('computes an income statement before any transactions', async () => {
            pre = await isRepo.findIncomeStatement("2009-Q1")
        })

        it('has the correct date range', () => {
            expect(pre.startDate).toBe("2009-01-01")
            expect(pre.endDate).toBe("2009-03-31")
        })

        it('has no income line items', () => {
            expect(pre.incomeLineItems.length).toBe(0)
        })

        it('has no expense line items', () => {
            expect(pre.expenseLineItems.length).toBe(0)
        })

        it('has zero total income', () => {
            expect(pre.totalIncome).toBe("$0.00")
        })

        it('has zero total expenses', () => {
            expect(pre.totalExpenses).toBe("$0.00")
        })

        it('has zero net income', () => {
            expect(pre.netIncome).toBe("$0.00")
        })
    })

    it('closes the database', async () => {
        await db.close()
    })
})
